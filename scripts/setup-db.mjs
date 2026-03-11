// scripts/setup-db.mjs
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.urnagawdqxetwwyymdeh.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Bottle1206!@#',
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- 1. 사용자 프로필
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  company text,
  plan text default 'basic' check (plan in ('basic', 'pro', 'enterprise')),
  analysis_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 고객 정보
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  birth_date date,
  gender text check (gender in ('male', 'female')),
  phone text,
  memo text,
  created_at timestamptz default now()
);

-- 3. PDF 업로드 기록
CREATE TABLE IF NOT EXISTS public.uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null check (file_type in ('basic_info', 'prescription', 'detail_treatment')),
  raw_text text,
  created_at timestamptz default now()
);

-- 4. 분석 결과
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade,
  upload_ids uuid[] not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'error')),
  medical_history jsonb,
  disclosure_summary jsonb,
  product_eligibility jsonb,
  claim_assessment jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. 보험상품 고지의무 룰 DB
CREATE TABLE IF NOT EXISTS public.insurance_products (
  id uuid default gen_random_uuid() primary key,
  company text not null,
  product_name text not null,
  product_type text not null check (product_type in ('simple', 'mild', 'standard')),
  disclosure_rules jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 6. 보험약관 DB
CREATE TABLE IF NOT EXISTS public.insurance_clauses (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.insurance_products(id) on delete cascade,
  clause_type text not null,
  clause_text text not null,
  coverage_conditions jsonb,
  exclusions jsonb,
  created_at timestamptz default now()
);

-- RLS 정책
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own customers') THEN
    CREATE POLICY "Users can manage own customers" ON public.customers FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own uploads') THEN
    CREATE POLICY "Users can manage own uploads" ON public.uploads FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own analyses') THEN
    CREATE POLICY "Users can manage own analyses" ON public.analyses FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read insurance products') THEN
    CREATE POLICY "Anyone can read insurance products" ON public.insurance_products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read insurance clauses') THEN
    CREATE POLICY "Anyone can read insurance clauses" ON public.insurance_clauses FOR SELECT USING (true);
  END IF;
END $$;

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 시드 데이터
INSERT INTO insurance_products (company, product_name, product_type, disclosure_rules)
SELECT '공통', '간편보험 (병력 1년)', 'simple', '{"rules":[{"ruleId":"simple_1","question":"최근 3개월 이내 의사로부터 입원필요소견, 수술필요소견, 추가검사(재검사), 질병의심소견, 질병확정진단을 받은 사실이 있습니까?","periodMonths":3,"conditions":["medical_opinion"]},{"ruleId":"simple_2","question":"최근 1년 이내 질병이나 상해사고로 인하여 입원 또는 수술(제왕절개 포함)을 받은 사실이 있습니까?","periodMonths":12,"conditions":["hospitalization","surgery"]},{"ruleId":"simple_3","question":"최근 1년 이내 6대질병(암,뇌졸중,급성심근경색,협심증,심장판막증,간경화) 진단/입원/수술 여부","periodMonths":12,"conditions":["diagnosis"],"targetDiseases":["암","뇌졸중","급성심근경색","협심증","심장판막증","간경화"]}]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM insurance_products WHERE product_type = 'simple');

INSERT INTO insurance_products (company, product_name, product_type, disclosure_rules)
SELECT '공통', '초경증 간편보험', 'mild', '{"rules":[{"ruleId":"mild_1","question":"최근 3개월 이내 의사로부터 입원필요소견, 수술필요소견, 추가검사(재검사), 질병의심소견, 질병확정진단을 받은 사실이 있습니까?","periodMonths":3,"conditions":["medical_opinion"]},{"ruleId":"mild_2","question":"최근 5년~10년 이내 질병이나 상해사고로 인하여 입원 또는 수술(제왕절개 포함)을 받은 사실이 있습니까?","periodMonths":60,"conditions":["hospitalization","surgery"]},{"ruleId":"mild_3","question":"최근 5년 이내 6대질병 관련 의료행위를 받은 사실이 있습니까?","periodMonths":60,"conditions":["diagnosis","treatment","hospitalization","surgery"],"targetDiseases":["암","협심증","심근경색","뇌졸중","뇌출혈","뇌경색","간경화","심장판막증"]}]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM insurance_products WHERE product_type = 'mild');

INSERT INTO insurance_products (company, product_name, product_type, disclosure_rules)
SELECT '공통', '일반 표준체 건강체 보험', 'standard', '{"rules":[{"ruleId":"std_1","question":"최근 3개월 이내 의사로부터 진찰 또는 검사(건강검진 포함)를 통하여 의료행위를 받은 사실이 있습니까?","periodMonths":3,"conditions":["any_treatment"]},{"ruleId":"std_2","question":"최근 3개월 이내 혈압강하제, 신경안정제, 수면제, 각성제, 진통제 등 약물을 상시 복용한 사실이 있습니까?","periodMonths":3,"conditions":["chronic_medication"],"targetMedications":["혈압강하제","신경안정제","수면제","각성제","진통제"]},{"ruleId":"std_3","question":"최근 1년 이내 추가검사(재검사)를 받은 사실이 있습니까?","periodMonths":12,"conditions":["additional_test"]},{"ruleId":"std_4","question":"최근 5년 이내 입원, 수술, 7일이상 치료, 30일이상 투약을 받은 사실이 있습니까?","periodMonths":60,"conditions":["hospitalization","surgery","treatment_7days","medication_30days"]},{"ruleId":"std_5","question":"최근 5년 이내 10대 질병 관련 의료행위를 받은 사실이 있습니까?","periodMonths":60,"conditions":["diagnosis","treatment","hospitalization","surgery","medication"],"targetDiseases":["암","백혈병","고혈압","협심증","심근경색","심장판막증","간경화증","뇌졸중","뇌출혈","뇌경색","당뇨병","에이즈"]},{"ruleId":"std_6","question":"건강고지형 할인 상품: 최근 N년 이내 입원/수술 여부","periodMonths":120,"conditions":["hospitalization","surgery"]}]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM insurance_products WHERE product_type = 'standard');
`;

async function main() {
  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected! Running SQL...');

    await client.query(sql);

    console.log('✅ Database tables created successfully!');

    const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Tables:', rows.map(r => r.table_name));

    const { rows: products } = await client.query("SELECT product_name, product_type FROM insurance_products");
    console.log('Insurance products:', products);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  trainer_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration TEXT NOT NULL DEFAULT '',
  available_seats INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.training_programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_programs TO authenticated;
GRANT ALL ON public.training_programs TO service_role;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  attendance_status TEXT NOT NULL DEFAULT 'pending',
  completion_status TEXT NOT NULL DEFAULT 'ongoing',
  UNIQUE (student_id, training_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view programs" ON public.training_programs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert programs" ON public.training_programs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update programs" ON public.training_programs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete programs" ON public.training_programs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own registrations" ON public.registrations FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students create own registrations" ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins update registrations" ON public.registrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students cancel own registrations" ON public.registrations FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

-- Auto profile + default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.training_programs (title, trainer_name, category, description, start_date, end_date, duration, available_seats) VALUES
('Full Stack Web Development Bootcamp', 'Dr. R. Venkatesan', 'Web Development', 'Hands-on bootcamp covering React, Node.js, Express and databases with a capstone project.', '2026-10-12', '2026-10-30', '3 Weeks', 40),
('Python for Data Science', 'Prof. Anitha Raman', 'Data Science', 'NumPy, Pandas, visualisation and an introduction to machine learning workflows.', '2026-10-05', '2026-10-16', '2 Weeks', 35),
('Cloud Fundamentals & DevOps', 'Mr. Karthik Iyer', 'Cloud', 'Containers, CI/CD pipelines and deploying applications to the cloud.', '2026-11-02', '2026-11-13', '2 Weeks', 25),
('Cybersecurity Essentials Workshop', 'Ms. Divya Shankar', 'Security', 'Threat modelling, secure coding practices and practical penetration testing labs.', '2026-10-20', '2026-10-24', '1 Week', 30),
('Placement Aptitude & Soft Skills', 'Mr. Suresh Babu', 'Career', 'Quantitative aptitude, group discussion practice and mock technical interviews.', '2026-11-09', '2026-11-27', '3 Weeks', 60);

CREATE TYPE public.tipo_lead AS ENUM ('Clínica', 'Hospital', 'Veterinário', 'Consultório');

ALTER TABLE public.leads ADD COLUMN tipo public.tipo_lead;
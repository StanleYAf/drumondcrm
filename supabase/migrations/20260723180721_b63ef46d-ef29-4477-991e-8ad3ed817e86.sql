ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS arkmeds_base text;

UPDATE public.clientes SET arkmeds_base = 'DSH'
WHERE id IN (
  'ec514634-e21a-4884-b580-1cb0974ad1b1',
  '43c96456-a75b-4f24-93ef-216fb7e27d7c',
  'a5e8f62b-34ba-4ed2-8814-1a483312bc95',
  '2e1ac9c4-0307-4d9e-9040-788ed2aa847f'
);
UPDATE public.clientes SET arkmeds_base = 'COMG'
WHERE id = 'adb4ad18-3725-4b25-b2a6-31fa3b8d2119';
UPDATE public.clientes SET arkmeds_base = 'SEMPER'
WHERE id = 'c56f17f2-d70c-46f4-9145-982f4bd216f8';
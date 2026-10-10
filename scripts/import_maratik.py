"""Import reviewed career materials. Never overwrite tracking state."""
import pathlib, json, re, shutil, hashlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'maratik'
out = ROOT / 'public'
report = (SOURCE / 'output/job-applications/ods-2026-10-07.md').read_text()
resume = json.loads((SOURCE / 'resume/content.json').read_text())
companies = ['AIRI','ВТБ','YADRO','Цифровые Технологии и Платформы','Sobolev Research Center','GetTransfer','Beeline','Dubai Health Authority','KitIngen','Лучи','OneCell']
contacts = ['shashkova@airi.net','scarkov@vtb.ru','@lvbakunina','MishinaAV@digtp.com','','https://thethinksters.typeform.com/to/B43uKhjW','','vu.borisoff@gmail.com','Olga','@donantonn','@Golubev_Darts']
channels = ['Email','Email','Telegram','Email','Unknown','Typeform','Unknown','Email','Telegram','Telegram','Telegram']
locations = ['Moscow','Moscow · Hybrid','Remote / Office','Remote · Russia','Novosibirsk · Office','Tashkent · Relocation','Remote · Russia','Dubai · Office','Remote · Part-time','Remote / Moscow','Remote']
salaries = ['From ₽150k','Not specified','From ₽450k','From ₽300k','₽220–450k','$4–6k','From ₽350k','From $10k','From $1k','₽600–700k gross','₽300–500k']
rows = [x for x in report.splitlines() if x.startswith('| [')]
assert len(rows) == 11
jobs=[]
for i,row in enumerate(rows):
 c=[x.strip() for x in row.strip('|').split('|')]
 title,url=re.match(r'\[(.*?)\]\((.*?)\)',c[0]).groups()
 draft=re.search(r'^### '+re.escape(companies[i])+r'\n\n(.*?)(?=\n### |\n## |\Z)',report,re.S|re.M)
 historical=i in [4,6]
 jobs.append(dict(id=url.rsplit('/',1)[1],company=companies[i],role=title.split(' — ',1)[1],url=url,description=c[1],fit=c[2],language=c[3],evidence=c[4],channel=channels[i],contact=contacts[i],location=locations[i],salary=salaries[i],status='Under review' if i==8 else 'Applied',appliedAt='' if historical else '2026-10-07',dateNote='Earlier send; exact date unknown' if historical else '7 Oct 2026',evidenceType='User-confirmed' if historical else 'Verified in session',followUp='',notes='',coverLetter=draft.group(1).strip() if draft else '',letterTransmission='Not transmitted: the form had no cover-letter field.' if i==5 else ('Prepared text; transmission not independently verified.' if historical else 'Application text recorded in the source report.'),history=[dict(at='2026-10-07',type='Imported evidence',text=c[4])]+([dict(at='2026-10-07',type='Recruiter reply',text='Olga replied at 17:35: many applications, under review, can stay in touch.')] if i==8 else [])))
assets=[]
for lang in ['en','ru']:
 filename=f'resume-{lang}.pdf'; src=SOURCE/'assets'/filename
 shutil.copy2(src,out/'assets'/filename)
 assets.append(dict(title=f'Resume · {lang.upper()}',kind='PDF',url=f'/assets/{filename}',source=f'maratik/assets/{filename}',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),bytes=src.stat().st_size,description='Current career CV imported from Maratik on 10 Oct 2026. May differ from the PDF sent on 7 Oct.'))
shutil.copy2(SOURCE/'resume/content.json',out/'assets/resume-content.json')
shutil.copy2(SOURCE/'output/job-applications/ods-2026-10-07.md',out/'assets/application-report.md')
assets += [dict(title='Bilingual career source',kind='JSON',url='/assets/resume-content.json',source='maratik/resume/content.json',description='English and Russian profile, experience, education and skills.'),dict(title='Original application report',kind='MD',url='/assets/application-report.md',source='maratik/output/job-applications/ods-2026-10-07.md',description='All 11 roles, prepared letters, send evidence and historical log.')]
for slug in ['ozon','artlebedev','sberbank','worksquad']:
 src=SOURCE/'projects'/slug/'index.html'
 assets.append(dict(title={'ozon':'Ozon · ML in production','artlebedev':'Art. Lebedev · Ironov','sberbank':'SberBank · Data & automation','worksquad':'Worksquad · Project page'}[slug],kind='Case study',url=f'https://maratik.fun/projects/{slug}/',source=f'maratik/projects/{slug}/index.html',description='Portfolio case study'+(' (source page currently contains a title only).' if slug=='worksquad' else '.'),content=src.read_text()))
# Keep raw case pages as private reference documents, not a broken copy of the portfolio UI.
for a in assets:
 if 'content' in a:
  slug=a['source'].split('/')[2]; (out/'assets'/f'case-{slug}.html').write_text(a.pop('content')); a['localUrl']=f'/assets/case-{slug}.html'
seed=dict(schemaVersion=1,revision=0,importedAt='2026-10-10',source=dict(project='maratik',report='output/job-applications/ods-2026-10-07.md',sessionId='01a1178a-1c1b-7e10-9afe-81d8efc4e9c3',sessionDate='2026-10-07',note='Final report and final Codex messages confirm 11/11 submitted. This is historical evidence; inboxes have not been checked for newer replies.'),profile=resume,contacts=dict(email='maratgasanov6@gmail.com',phone='+7 989 881-13-36',telegram='https://t.me/M4PAT1K',github='https://github.com/gassannov',linkedin='https://www.linkedin.com/in/marat-gasanov-a82878308/',portfolio='https://maratik.fun',location='Moscow, Russia',relocation='Tashkent confirmed; other cities not confirmed.'),assets=assets,jobs=jobs)
(out/'data/seed.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(jobs)} jobs, {len(assets)} assets, {len(resume["en"]["jobs"])} experience entries. Tracking state untouched.')

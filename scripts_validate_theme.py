#!/usr/bin/env python3
"""Pre-push check for things Shopify's importer rejects SILENTLY (theme-check misses them):
- settings_data / templates / section groups: range on step + within bounds, select in options,
  color_scheme refs, empty-string for resource pickers, hash urls
- schema names (section / block / preset) <= 25 chars
- inline_richtext values using tags other than <em>/<strong>/<a>/<br>
Run: python3 scripts_validate_theme.py   (exit 1 on any finding)
"""
import json,re,glob,os,sys
def _load(p):
    """Shopify re-adds a /* ... */ header to files it writes back. Strip it."""
    return json.loads(re.sub(r'^\s*/\*.*?\*/\s*','',open(p).read(),flags=re.S))
bad=0
def warn(m):
    global bad; bad+=1; print('✗',m)
schemas={}
for f in glob.glob('sections/*.liquid'):
    s=open(f).read(); m=re.search(r'{%\s*schema\s*%}(.*?){%\s*endschema\s*%}',s,re.S)
    if not m: continue
    try: d=json.loads(m.group(1))
    except Exception as e: warn(f'{f}: schema JSON invalid: {e}'); continue
    schemas[os.path.basename(f)[:-7]]=d
    for obj in [d]+d.get('blocks',[])+d.get('presets',[]):
        n=obj.get('name','')
        if not n.startswith('t:') and len(n)>25: warn(f'{f}: schema name > 25 chars: {n!r}')
sd=_load('config/settings_data.json'); schemes=set(sd['current'].get('color_schemes',{}))
INLINE_OK=re.compile(r'</?(em|strong|a|br)\b[^>]*>')
def check(where, settings, defs):
    ids={d['id']:d for d in defs if 'id' in d}
    for k,v in settings.items():
        d=ids.get(k)
        if not d: continue
        t=d['type']
        if t=='range' and not (isinstance(v,(int,float)) and d['min']<=v<=d['max'] and round((v-d['min'])/d['step'],6)%1==0): warn(f'{where}: {k}={v} off range/step (min {d["min"]} max {d["max"]} step {d["step"]})')
        elif t=='select' and v not in [o['value'] for o in d['options']]: warn(f'{where}: {k}={v!r} not a valid option')
        elif t=='color_scheme' and v and v not in schemes: warn(f'{where}: {k}={v!r} unknown color scheme')
        elif t=='url' and isinstance(v,str) and v.startswith('#'): warn(f'{where}: {k}={v!r} hash url not allowed')
        elif isinstance(v,str) and '{{' in v: warn(f'{where}: {k} contains Liquid braces — JSON template settings are not rendered as Liquid')
        elif t=='page' and v=='': warn(f'{where}: {k} is "" — omit the key instead (proven to drop the template)')
        elif t=='inline_richtext' and isinstance(v,str):
            leftover=INLINE_OK.sub('',v)
            if re.search(r'<[a-z]',leftover): warn(f'{where}: {k} inline_richtext has a disallowed tag: {v[:60]!r}')
sch=_load('config/settings_schema.json'); gl=[st for g in sch for st in g.get('settings',[])]
check('settings_data', {k:v for k,v in sd['current'].items() if k not in('sections','blocks','content_for_index','color_schemes')}, gl)
for p in sorted(glob.glob('templates/**/*.json',recursive=True)+glob.glob('sections/*.json')):
    d=_load(p)
    for sid,sec in d.get('sections',{}).items():
        if sec['type'].startswith('shopify://'): continue
        s=schemas.get(sec['type'])
        if not s: continue
        check(f'{p}:{sid}',sec.get('settings',{}),s.get('settings',[]))
        bt={b['type']:b for b in s.get('blocks',[])}
        for bid,blk in sec.get('blocks',{}).items():
            if blk['type'] in bt: check(f'{p}:{sid}:{bid}',blk.get('settings',{}),bt[blk['type']].get('settings',[]))
print('OK — nothing Shopify would drop' if not bad else f'{bad} finding(s)'); sys.exit(1 if bad else 0)

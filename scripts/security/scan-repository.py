#!/usr/bin/env python3
"""Offline supplemental secret scan. Emits locations/types only, never matches.
Not a substitute for a maintained secret scanner or credential rotation.
"""
import argparse,json,re,subprocess,sys
from pathlib import Path
RULES={
 'credential-url':re.compile(rb'(?i)(?:postgres(?:ql)?|mysql|redis|https?)://[^\s/\x27\x22`<>]+:[^\s@\x27\x22`<>]+@'),
 'private-key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----'),
 'github-token':re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b'),
 'aws-key':re.compile(rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
 'stripe-live':re.compile(rb'\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b'),
 'jwt':re.compile(rb'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'),
 'google-key':re.compile(rb'\bAIza[A-Za-z0-9_-]{30,}\b'),
 'slack-token':re.compile(rb'\bxox[baprs]-[A-Za-z0-9-]{20,}\b'),
 'literal-secret':re.compile(rb'''(?i)["']?(?:access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret|password|secret[_-]?access[_-]?key)["']?\s*[:=]\s*["']([^"'\r\n]{16,})["']'''),
}
def git(*args):return subprocess.check_output(['git',*args])
def findings(data,high_confidence=False):
 out=[]
 for kind,rx in RULES.items():
  if high_confidence and kind=='literal-secret':continue
  for m in rx.finditer(data):out.append({'kind':kind,'line':data.count(b'\n',0,m.start())+1})
 return out

def main():
 a=argparse.ArgumentParser();a.add_argument('--history',action='store_true');a.add_argument('--high-confidence',action='store_true');a.add_argument('--ref',default='HEAD');a.add_argument('--output');args=a.parse_args();found=[];count=0
 if args.history:
  objects=git('rev-list','--objects',args.ref).splitlines()
  proc=subprocess.Popen(['git','cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
  for row in objects:
   oid,_,path=row.partition(b' ');proc.stdin.write(oid+b'\n');proc.stdin.flush();header=proc.stdout.readline().split();size=int(header[2]);data=proc.stdout.read(size);proc.stdout.read(1)
   if header[1]!=b'blob':continue
   count+=1
   for f in findings(data,args.high_confidence):found.append({'object':oid.decode(),'path':path.decode(errors='replace'),**f})
  proc.stdin.close();proc.wait()
 else:
  files=git('ls-files','--cached','--others','--exclude-standard','-z').split(b'\0')
  for name in files:
   if not name:continue
   p=Path(name.decode());
   if not p.is_file() or p.is_symlink():continue
   data=p.read_bytes();count+=1
   for f in findings(data,args.high_confidence):found.append({'path':str(p),**f})
 if args.high_confidence:found=[f for f in found if f['kind']!='literal-secret']
 report={'scope':args.ref if args.history else 'working-tree-tracked-and-unignored','objectsScanned':count,'findings':found,'redacted':True}
 value=json.dumps(report,indent=2)+'\n'
 if args.output:Path(args.output).write_text(value)
 else:print(value,end='')
 return bool(found)
if __name__=='__main__':sys.exit(main())

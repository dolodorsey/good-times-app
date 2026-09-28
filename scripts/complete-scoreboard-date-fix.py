from pathlib import Path
p=Path('api/sports-live.js');s=p.read_text()
# Provider rejected all range queries with HTTP 400. Use a single selected-day contract, not a retry storm or alternate host.
old="to:shiftDate(date,7)";assert s.count(old)==1;s=s.replace(old,'to:date')
old="scope.date.replaceAll('-','')+'-'+scope.to.replaceAll('-','')";assert s.count(old)==1;s=s.replace(old,"scope.date.replaceAll('-','')")
old="if(!r.ok)return {league,items:[],ok:false,httpStatus,errorClass:'HTTP'};";assert s.count(old)==1;s=s.replace(old,"if(!r.ok){const detail=httpStatus===400?(await r.text()).slice(0,400):null;console.warn('Sports provider read failed',{league,httpStatus,detail});return {league,items:[],ok:false,httpStatus,errorClass:'HTTP'}};")
p.write_text(s)
p=Path('src/features/experience/complete/Collections.jsx');s=p.read_text();assert 'Week starting' in s;p.write_text(s.replace('Week starting','Game date'))
print('Sports uses one selected Atlanta-local game date and a bounded diagnostic for malformed provider requests.')

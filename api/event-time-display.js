/** API display values for documented doors-only listings. No showtime inference. */
export function validClock(value) {
  const match=String(value??'').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if(!match||Number(match[1])>23||Number(match[2])>59)return null;
  return `${String(Number(match[1])).padStart(2,'0')}:${match[2]}`;
}
export function eventTimeFields(item={}) {
  const performance=validClock(item.show_time),doors=validClock(item.doors_time);
  if(performance)return {event_time:performance,performance_time:performance,doors_time:doors,time_basis:'performance'};
  if(doors){
    const [h,m]=doors.split(':');
    const label=`Doors ${Number(h)%12||12}:${m} ${Number(h)>=12?'PM':'AM'} · showtime TBA`;
    // Existing customer fmtTime intentionally passes non-clock display labels through.
    // Keeping performance_time null also prevents invented Tonight/OPEN NOW claims.
    return {event_time:label,performance_time:null,doors_time:doors,time_basis:'doors'};
  }
  return {event_time:null,performance_time:null,doors_time:null,time_basis:'unknown'};
}

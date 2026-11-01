export function timeToMinutes(time) {
  const [ hours, minutes ] = time.split(':')
  return (+hours *60) + (+minutes);
}
export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;  
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  
  return `${paddedHours}:${paddedMinutes}`;
}
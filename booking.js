// SALIERI Booking — public browser integration. Only the publishable key belongs here.
const SUPABASE_URL = "https://tjxjsjhitjybymxddihf.supabase.co";
const SUPABASE_KEY = "sb_publishable_S55v70FypFoyw0relmO5WQ_KInYHnfd";
const CREATE_BOOKING_URL = SUPABASE_URL + "/functions/v1/create-booking";
const AVAILABILITY_URL = SUPABASE_URL + "/functions/v1/get-availability";
const headers = {"Content-Type":"application/json","apikey":SUPABASE_KEY};
const $ = id => document.getElementById(id);
const serviceEl=$("booking-service"), specialistEl=$("booking-specialist"), dateEl=$("booking-date"), timeEl=$("booking-time"), form=$("salieri-booking-form"), messageEl=$("booking-message");
const say=(text,error=false)=>{messageEl.textContent=text;messageEl.classList.toggle("error",error);};
const localDate = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Sofia",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
dateEl.min=localDate;
let serviceLinks=[];
let availabilityRequest=0;

async function getRows(table,query="") {
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+table+"?"+query,{headers:{apikey:SUPABASE_KEY}});
  if(!r.ok) throw new Error("Не успяхме да заредим данните.");
  return r.json();
}
function addOptions(select,placeholder,items,makeLabel) {
  select.replaceChildren(new Option(placeholder,""));
  for (const item of items) select.add(new Option(makeLabel(item),item.id));
}
async function loadOptions() {
  try {
    const [services,specialists,links]=await Promise.all([
      getRows("services","select=id,name,duration_minutes,price_eur&active=eq.true&order=name"),
      getRows("specialists","select=id,name&active=eq.true&order=name"),
      getRows("specialist_services","select=specialist_id,service_id")
    ]);
    if(!Array.isArray(services)||!Array.isArray(specialists)||!Array.isArray(links)) throw new Error("Получихме невалидни данни от базата.");
    addOptions(serviceEl,"Избери услуга",services,s=>s.name+" · €"+Number(s.price_eur).toFixed(2)+" · "+s.duration_minutes+" мин.");
    addOptions(specialistEl,"Избери специалист",specialists,p=>p.name);
    serviceLinks=links;
  } catch(e) {
    say(e.message,true);
  }
}
function resetTimes(text="Избери услуга, специалист и дата") {
  timeEl.disabled=true;
  timeEl.replaceChildren(new Option(text,""));
}
async function loadTimes() {
  const requestId=++availabilityRequest;
  const sid=serviceEl.value,pid=specialistEl.value,date=dateEl.value;
  resetTimes("Проверяваме свободните часове…");
  if(!sid||!pid||!date){resetTimes();return;}
  if(!serviceLinks.some(x=>x.service_id===sid&&x.specialist_id===pid)){
    resetTimes("Този специалист не предлага услугата");return;
  }
  try {
    const r=await fetch(AVAILABILITY_URL,{method:"POST",headers,body:JSON.stringify({specialist_id:pid,service_id:sid,date})});
    const data=await r.json();
    if(requestId!==availabilityRequest) return;
    if(!r.ok) throw new Error(data.error||"Неуспешна проверка.");
    if(!Array.isArray(data.slots)) throw new Error("Получихме невалиден списък със свободни часове.");
    timeEl.replaceChildren(new Option("Избери свободен час",""));
    for(const slot of data.slots) timeEl.add(new Option(slot.time,slot.starts_at));
    timeEl.disabled=data.slots.length===0;
    if(!data.slots.length) resetTimes("Няма свободни часове за тази дата");
  } catch(e) {
    if(requestId!==availabilityRequest) return;
    resetTimes("Грешка при зареждане");
    say(e.message,true);
  }
}
serviceEl.addEventListener("change",loadTimes);
specialistEl.addEventListener("change",loadTimes);
dateEl.addEventListener("change",loadTimes);

form.addEventListener("submit",async e=>{
  e.preventDefault();
  say("");
  if(!timeEl.value){say("Моля, избери свободен час.",true);return;}
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;button.textContent="ИЗПРАЩАНЕ…";
  try {
    const r=await fetch(CREATE_BOOKING_URL,{method:"POST",headers,body:JSON.stringify({
      specialist_id:specialistEl.value,
      service_id:serviceEl.value,
      starts_at:timeEl.value,
      customer_name:$("booking-name").value.trim(),
      customer_phone:$("booking-phone").value.trim()
    })});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Заявката не беше изпратена.");
    const bookingCode=data.booking&&data.booking.id?data.booking.id.slice(0,8):"";
    say("Заявката е изпратена! SALIERI ще потвърди часа с теб."+ (bookingCode?" Номер: "+bookingCode:""));
    form.reset();dateEl.min=localDate;resetTimes();await loadOptions();
  } catch(err) {
    say(err.message,true);
    await loadTimes();
  } finally {
    button.disabled=false;button.textContent="ИЗПРАТИ ЗАЯВКА ↗";
  }
});
loadOptions();

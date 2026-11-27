// SALIERI Booking — public browser integration. Only the publishable key belongs here.
const SUPABASE_URL = "https://tjxjsjhitjybymxddihf.supabase.co";
const SUPABASE_KEY = "sb_publishable_S55v70FypFoyw0relmO5WQ_KInYHnfd";
const CREATE_BOOKING_URL = SUPABASE_URL + "/functions/v1/create-booking";
const AVAILABILITY_URL = SUPABASE_URL + "/functions/v1/get-availability";
const headers = {"Content-Type":"application/json","apikey":SUPABASE_KEY};
const $ = id => document.getElementById(id);
const serviceEl=$("booking-service"), specialistEl=$("booking-specialist"), dateEl=$("booking-date"), timeEl=$("booking-time"), form=$("salieri-booking-form"), messageEl=$("booking-message");
const say=(text,error=false)=>{messageEl.textContent=text;messageEl.classList.toggle("error",error)};
const today=new Date(); const localDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Sofia",year:"numeric",month:"2-digit",day:"2-digit"}).format(today);
dateEl.min=localDate;
async function getRows(table,query=""){const r=await fetch(SUPABASE_URL+"/rest/v1/"+table+"?"+query,{headers:{apikey:SUPABASE_KEY}});if(!r.ok)throw new Error("Не успяхме да заредим данните.");return r.json();}
async function loadOptions(){
 try{
  const [services,specialists,links]=await Promise.all([getRows("services","select=id,name,duration_minutes,price_eur&active=eq.true&order=name"),getRows("specialists","select=id,name,specialty&active=eq.true&order=name"),getRows("specialist_services","select=specialist_id,service_id")]);
  serviceEl.innerHTML='<option value="">Избери услуга</option>'+services.map(s=>'<option value="'+s.id+'">'+s.name+' · €'+Number(s.price_eur).toFixed(2)+' · '+s.duration_minutes+' мин.</option>').join("");
  specialistEl.innerHTML='<option value="">Избери специалист</option>'+specialists.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join("");
  window.salieriLinks=links;
 }catch(e){say(e.message,true);}
}
function resetTimes(text="Избери услуга, специалист и дата"){timeEl.disabled=true;timeEl.innerHTML='<option value="">'+text+'</option>';}
async function loadTimes(){
 resetTimes("Проверяваме свободните часове…");
 const sid=serviceEl.value,pid=specialistEl.value,date=dateEl.value;
 if(!sid||!pid||!date){resetTimes();return;}
 if(!(window.salieriLinks||[]).some(x=>x.service_id===sid&&x.specialist_id===pid)){resetTimes("Този специалист не предлага услугата");return;}
 try{
  const r=await fetch(AVAILABILITY_URL,{method:"POST",headers,body:JSON.stringify({specialist_id:pid,service_id:sid,date})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||"Неуспешна проверка.");
  timeEl.innerHTML='<option value="">Избери свободен час</option>'+data.slots.map(x=>'<option value="'+x.starts_at+'">'+x.time+'</option>').join("");
  timeEl.disabled=false;if(!data.slots.length)resetTimes("Няма свободни часове за тази дата");
 }catch(e){resetTimes("Грешка при зареждане");say(e.message,true);}
}
serviceEl.addEventListener("change",loadTimes);specialistEl.addEventListener("change",loadTimes);dateEl.addEventListener("change",loadTimes);
form.addEventListener("submit",async e=>{
 e.preventDefault();say("");
 if(!timeEl.value){say("Моля, избери свободен час.",true);return;}
 const button=form.querySelector("button[type=submit]");button.disabled=true;button.textContent="ИЗПРАЩАНЕ…";
 try{
  const r=await fetch(CREATE_BOOKING_URL,{method:"POST",headers,body:JSON.stringify({specialist_id:specialistEl.value,service_id:serviceEl.value,starts_at:timeEl.value,customer_name:$("booking-name").value,customer_phone:$("booking-phone").value})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||"Заявката не беше изпратена.");
  say("Заявката е изпратена! SALIERI ще потвърди часа с теб. Запази номера си: "+data.booking.id.slice(0,8));
  form.reset();dateEl.min=localDate;resetTimes();await loadOptions();
 }catch(err){say(err.message,true);await loadTimes();}
 finally{button.disabled=false;button.textContent="ИЗПРАТИ ЗАЯВКА ↗";}
});
loadOptions();

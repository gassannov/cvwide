const form=document.querySelector('[data-password-form]'),input=document.querySelector('#password'),slots=[...document.querySelectorAll('[data-password-slot]')],error=document.querySelector('[data-login-error]');
const workspacePrefix='';
const render=()=>slots.forEach((slot,index)=>{slot.textContent=input.value[index]||'';slot.classList.toggle('is-current',index===Math.min(input.value.length,3));});
let pending=false;
input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4);error.textContent='';render();if(input.value.length===4&&!pending)form.requestSubmit();});
form.addEventListener('click',()=>input.focus());
form.addEventListener('submit',async event=>{
 event.preventDefault();if(pending)return;pending=true;input.disabled=true;
 try{
  const response=await fetch(workspacePrefix+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:input.value})});
  input.value='';render();
  if(!response.ok){error.textContent=response.status===401?'wrong password':'try again later';return;}
  const page=await fetch(workspacePrefix+'/workspace');if(!page.ok)throw Error('Could not open workspace');
  document.open();document.write(await page.text());document.close();
 }catch{error.textContent='try again later';}finally{pending=false;input.disabled=false;input.focus();}
});
render();

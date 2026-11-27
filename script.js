// SALIERI V2: smooth anchor navigation and mobile menu close
 document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('nav').classList.remove('open')));

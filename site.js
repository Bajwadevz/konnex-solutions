(function(){
  var toggle=document.querySelector('.menu-toggle'),menu=document.getElementById('site-nav');
  var ddBtn=document.querySelector('.dd-btn'),dd=document.getElementById('dd-solutions');
  function setMenu(o){menu.classList.toggle('open',o);toggle.setAttribute('aria-expanded',o?'true':'false');}
  function setDd(o){if(!dd)return;dd.classList.toggle('open',o);ddBtn.setAttribute('aria-expanded',o?'true':'false');}
  if(toggle){toggle.addEventListener('click',function(){setMenu(!menu.classList.contains('open'));});}
  if(ddBtn){
    ddBtn.addEventListener('click',function(e){e.stopPropagation();setDd(!dd.classList.contains('open'));});
    var li=ddBtn.parentElement,mq=window.matchMedia('(hover:hover) and (min-width:981px)'),t;
    li.addEventListener('mouseenter',function(){if(mq.matches){clearTimeout(t);setDd(true);}});
    li.addEventListener('mouseleave',function(){if(mq.matches){t=setTimeout(function(){setDd(false);},180);}});
    li.addEventListener('focusout',function(e){if(!li.contains(e.relatedTarget))setDd(false);});
  }
  document.addEventListener('click',function(e){if(dd&&!dd.parentElement.contains(e.target))setDd(false);});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      if(dd&&dd.classList.contains('open')){setDd(false);ddBtn.focus();}
      else if(menu&&menu.classList.contains('open')){setMenu(false);toggle.focus();}
    }
  });

  var pb=document.querySelector('.print-btn');if(pb)pb.addEventListener('click',function(){window.print();});

  var f=document.querySelector('form.contact-form');
  if(f){
    var err=f.querySelector('.form-error');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var bad=null;
      Array.prototype.forEach.call(f.querySelectorAll('[required]'),function(el){
        var ok=el.value.trim()!==''&&(el.type!=='email'||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        el.setAttribute('aria-invalid',ok?'false':'true');
        if(!ok&&!bad)bad=el;
      });
      if(bad){err.hidden=false;bad.focus();return;}
      err.hidden=true;
      var d=new FormData(f),g=function(k){return (d.get(k)||'').toString().trim()||'-';};
      var s='Talent request: '+g('need')+' ('+g('orgtype')+')';
      var m='Name: '+g('name')+'\nEmail: '+g('email')+'\nPhone: '+g('phone')+'\nOrganization: '+g('org')+'\nOrganization type: '+g('orgtype')+'\nState: '+g('state')+'\nRole or need: '+g('need')+'\nEngagement: '+g('model')+'\nRole title and headcount: '+g('role')+'\n\nDetails:\n'+g('message');
      window.location.href='mailto:info@konnexsolutions.com?subject='+encodeURIComponent(s)+'&body='+encodeURIComponent(m);
    });
  }
})();

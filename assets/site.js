(function(){
  var toggle=document.querySelector('.menu-toggle'),menu=document.getElementById('site-nav');
  function setMenu(o){menu.classList.toggle('open',o);toggle.setAttribute('aria-expanded',o?'true':'false');}
  if(toggle){toggle.addEventListener('click',function(){setMenu(!menu.classList.contains('open'));});}

  var mq=window.matchMedia('(hover:hover) and (min-width:1081px)');
  var dds=Array.prototype.map.call(document.querySelectorAll('.has-dd'),function(li){
    var b=li.querySelector('.dd-btn'),p=li.querySelector('.dd-panel'),t;
    var o={li:li,b:b,p:p,set:function(on){p.classList.toggle('open',on);b.setAttribute('aria-expanded',on?'true':'false');}};
    b.addEventListener('click',function(e){e.stopPropagation();var on=!p.classList.contains('open');closeAll();o.set(on);});
    li.addEventListener('mouseenter',function(){if(mq.matches){clearTimeout(t);closeAll();o.set(true);}});
    li.addEventListener('mouseleave',function(){if(mq.matches){t=setTimeout(function(){o.set(false);},180);}});
    li.addEventListener('focusout',function(e){if(!li.contains(e.relatedTarget))o.set(false);});
    return o;
  });
  function closeAll(){dds.forEach(function(d){d.set(false);});}
  document.addEventListener('click',function(e){dds.forEach(function(d){if(!d.li.contains(e.target))d.set(false);});});
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var open=dds.filter(function(d){return d.p.classList.contains('open');})[0];
    if(open){open.set(false);open.b.focus();}
    else if(menu&&menu.classList.contains('open')){setMenu(false);toggle.focus();}
  });

  var pb=document.querySelector('.print-btn');if(pb)pb.addEventListener('click',function(){window.print();});

  // contact tabs
  var tabs=Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab,focus){
    tabs.forEach(function(t){
      var on=t===tab;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;
      document.getElementById(t.getAttribute('aria-controls')).hidden=!on;
    });
    if(focus)tab.focus();
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){select(t,false);});
    t.addEventListener('keydown',function(e){
      var n=null;
      if(e.key==='ArrowRight')n=tabs[(i+1)%tabs.length];
      else if(e.key==='ArrowLeft')n=tabs[(i-1+tabs.length)%tabs.length];
      else if(e.key==='Home')n=tabs[0];else if(e.key==='End')n=tabs[tabs.length-1];
      if(n){e.preventDefault();select(n,true);}
    });
  });
  function fromHash(){
    if(!tabs.length)return;
    if(location.hash==='#sled'){select(document.getElementById('tab-sled'),false);var s=document.getElementById('start');if(s)s.scrollIntoView();}
  }
  fromHash();window.addEventListener('hashchange',fromHash);

  Array.prototype.forEach.call(document.querySelectorAll('form.contact-form'),function(f){
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
      var d=new FormData(f),g=function(k){return (d.get(k)||'').toString().trim()||'(not given)';};
      var s,m='Name: '+g('name')+'\nEmail: '+g('email')+'\nPhone: '+g('phone')+'\nOrganization: '+g('org')+'\n';
      if(f.getAttribute('data-kind')==='sled'){
        s='SLED IT project: '+g('project')+' ('+g('orgtype')+')';
        m+='Organization type: '+g('orgtype')+'\nProject type: '+g('project')+'\nBudget range: '+g('budget')+'\nTimeline: '+g('timeline')+'\n';
      }else{
        s='Talent request: '+g('service');
        m+='Need: '+g('service')+'\nTeam size: '+g('size')+'\n';
      }
      m+='\nDetails:\n'+g('message');
      window.location.href='mailto:info@konnexsolutions.com?subject='+encodeURIComponent(s)+'&body='+encodeURIComponent(m);
    });
  });
})();

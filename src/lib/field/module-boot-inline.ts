/** Inline classic script. Recovers ES modules when Cloudflare serves .js as octet-stream. */
export const MODULE_BOOT_INLINE = `(function(){
  var recovered=false;
  function jsType(t){
    t=(t||"").toLowerCase();
    return t.indexOf("javascript")!==-1||t.indexOf("ecmascript")!==-1||t.indexOf("wasm")!==-1;
  }
  function badType(t){
    t=(t||"").toLowerCase();
    return t.indexOf("octet-stream")!==-1||t==="text/plain"||t.indexOf("text/plain;")===0;
  }
  function recover(){
    if(recovered)return;
    recovered=true;
    var srcs=[];
    document.querySelectorAll('script[type="module"][src]').forEach(function(n){
      if(n.src&&n.src.indexOf("blob:")!==0)srcs.push(n.src);
    });
    document.querySelectorAll('link[rel="modulepreload"]').forEach(function(n){
      if(n.href)srcs.push(n.href);
    });
    srcs=srcs.filter(function(s,i){return srcs.indexOf(s)===i;});
    srcs.forEach(function(src){
      fetch(src,{credentials:"same-origin"}).then(function(r){return r.blob();}).then(function(blob){
        var s=document.createElement("script");
        s.type="module";
        s.async=true;
        s.src=URL.createObjectURL(new Blob([blob],{type:"text/javascript"}));
        document.body.appendChild(s);
      }).catch(function(){});
    });
  }
  window.addEventListener("error",function(ev){
    var t=ev.target;
    if(t&&t.tagName==="SCRIPT"&&t.type==="module")recover();
  },true);
  var probe=document.querySelector('link[rel="modulepreload"],script[type="module"][src]');
  var href=probe&&(probe.href||probe.src);
  if(href){
    fetch(href,{method:"HEAD",credentials:"same-origin"}).then(function(r){
      var type=r.headers.get("content-type")||"";
      if(!jsType(type)&&badType(type))recover();
    }).catch(function(){});
  }
})();`;

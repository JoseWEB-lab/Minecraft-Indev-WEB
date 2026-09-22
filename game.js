const canvas=document.getElementById('game'),gl=canvas.getContext('webgl',{antialias:false});
if(!gl){alert('Este navegador no soporta WebGL');}
const start=document.getElementById('start'), play=document.getElementById('play');
const hotbar=document.getElementById('hotbar');
const blocks=[
 {name:'Tierra',c:[.45,.28,.12]}, {name:'Césped',c:[.22,.62,.18]},
 {name:'Piedra',c:[.45,.45,.45]}, {name:'Madera',c:[.48,.29,.12]},
 {name:'Hojas',c:[.12,.48,.16]}, {name:'Arena',c:[.76,.68,.42]},
 {name:'Tablones',c:[.66,.43,.22]}
];
let selected=1; blocks.forEach((b,i)=>{let s=document.createElement('div');s.className='slot'+(i===selected?' sel':'');s.innerHTML=['🟫','🌱','⬜','🪵','🌿','🟨','🟫'][i]+'<small>'+i+'</small>';s.onclick=()=>{selected=i;document.querySelectorAll('.slot').forEach(x=>x.classList.remove('sel'));s.classList.add('sel')};hotbar.appendChild(s)});

const W=48,D=48,H=18, world=new Uint8Array(W*H*D);
const idx=(x,y,z)=>x+W*(z+D*y);
function height(x,z){return Math.max(1,Math.min(H-2,5+Math.floor(2*Math.sin(x*.21)+1.5*Math.cos(z*.17)+1.2*Math.sin((x+z)*.08))));}
for(let x=0;x<W;x++)for(let z=0;z<D;z++){let h=height(x,z);for(let y=0;y<=h;y++){let t=y===h?1:(y>h-3?0:2);world[idx(x,y,z)]=t}if((x*17+z*31)%29===0&&h+1<H)world[idx(x,h+1,z)]=3;}
const get=(x,y,z)=>(x<0||z<0||x>=W||z>=D||y<0||y>=H)?0:world[idx(x,y,z)];
const set=(x,y,z,v)=>{if(x>=0&&z>=0&&x<W&&z<D&&y>=0&&y<H)world[idx(x,y,z)]=v};

let vs=`attribute vec3 p;attribute vec3 n;uniform mat4 mvp;uniform vec3 col;varying vec3 v;void main(){v=col*(.55+.45*max(dot(n,normalize(vec3(.4,1.,.3))),0.));gl_Position=mvp*vec4(p,1.);}`;
let fs=`precision mediump float;varying vec3 v;void main(){gl_FragColor=vec4(v,1.);}`;
function shader(t,s){let q=gl.createShader(t);gl.shaderSource(q,s);gl.compileShader(q);return q}
let pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,vs));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
const ap=gl.getAttribLocation(pr,'p'),an=gl.getAttribLocation(pr,'n'),um=gl.getUniformLocation(pr,'mvp'),uc=gl.getUniformLocation(pr,'col');

function matMul(a,b){let o=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)o[r*4+c]+=a[r*4+k]*b[k*4+c];return o}
function perspective(f,a,n,fz){let t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(fz+n)/(n-fz);o[11]=-1;o[14]=2*fz*n/(n-fz);return o}
function look(eye,tar){let z=norm(sub(eye,tar)),x=norm(cross([0,1,0],z)),y=cross(z,x),o=new Float32Array(16);o.set([x[0],x[1],x[2],0,y[0],y[1],y[2],0,z[0],z[1],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);return o}
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{let l=Math.hypot(...a);return a.map(v=>v/l)};
const faces=[
 [[0,0,1],[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],
 [[0,0,-1],[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]],
 [[0,1,0],[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],
 [[0,-1,0],[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],
 [[1,0,0],[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],
 [[-1,0,0],[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]]
];
let verts=[],norms=[],cols=[];
function build(){verts=[];norms=[];cols=[];for(let y=0;y<H;y++)for(let z=0;z<D;z++)for(let x=0;x<W;x++){let b=get(x,y,z);if(!b)continue;let c=blocks[b].c;for(let f of faces){let d=f[0];if(get(x+d[0],y+d[1],z+d[2]))continue;for(let q of f[2]){verts.push(x+q[0],y+q[1],z+q[2]);norms.push(...f[1]);cols.push(...c)}}} }
build();
let vb=gl.createBuffer(),nb=gl.createBuffer(),cb=gl.createBuffer();
function upload(){gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(norms),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cols),gl.STATIC_DRAW)}
upload();

let pos=[24,9,24],vel=[0,0,0],yaw=.7,pitch=-.25,keys={};let grounded=false;
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code.startsWith('Digit'))selected=Math.min(6,+e.code.slice(5));if(e.code==='Space'&&grounded)vel[1]=6});
addEventListener('keyup',e=>keys[e.code]=false);
canvas.oncontextmenu=e=>e.preventDefault();
let locked=false;play.onclick=()=>{start.style.display='none';canvas.requestPointerLock?.()};document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===canvas);
document.addEventListener('mousemove',e=>{if(locked){yaw-=e.movementX*.002;pitch-=e.movementY*.002;pitch=Math.max(-1.5,Math.min(1.5,pitch))}});
function hit(){let dir=[Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),Math.cos(pitch)*Math.cos(yaw)];let p=[...pos],last=null;for(let i=0;i<80;i++){let b=[Math.floor(p[0]),Math.floor(p[1]),Math.floor(p[2])];if(get(...b))return {b,last};last=b;p=add(p,dir.map(v=>v*.08))}return null}
canvas.onmousedown=e=>{if(!locked){canvas.requestPointerLock?.();return}let h=hit();if(!h)return;if(e.button===0){set(...h.b,0);build();upload()}else if(e.button===2&&h.last){set(...h.last,selected);build();upload()}};

function collide(x,y,z){return get(Math.floor(x),Math.floor(y),Math.floor(z))!==0}
function update(dt){let f=[Math.sin(yaw),0,Math.cos(yaw)],r=[Math.cos(yaw),0,-Math.sin(yaw)],mv=[0,0,0];if(keys.KeyW)mv=add(mv,f);if(keys.KeyS)mv=sub(mv,f);if(keys.KeyD)mv=add(mv,r);if(keys.KeyA)mv=sub(mv,r);let l=Math.hypot(mv[0],mv[2]);if(l){mv[0]/=l;mv[2]/=l}let sp=keys.ShiftLeft?6:4;let nx=pos[0]+mv[0]*sp*dt,nz=pos[2]+mv[2]*sp*dt;if(!collide(nx,pos[1],pos[2]))pos[0]=nx;if(!collide(pos[0],pos[1],nz))pos[2]=nz;vel[1]-=18*dt;let ny=pos[1]+vel[1]*dt;if(vel[1]<=0&&collide(pos[0],ny-.8,pos[2])){grounded=true;vel[1]=0;pos[1]=Math.floor(ny-.8)+1.8}else{grounded=false;pos[1]=ny}if(pos[1]<-5){pos=[24,10,24];vel=[0,0,0]}}
function render(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.clearColor(.45,.72,.92,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let dir=[Math.cos(pitch)*Math.sin(yaw),Math.sin(pitch),Math.cos(pitch)*Math.cos(yaw)],tar=add(pos,dir),P=perspective(1.15,canvas.width/canvas.height,.05,150),V=look(pos,tar),M=matMul(P,V);gl.uniformMatrix4fv(um,false,M);for(let [buf,attr,size] of [[vb,ap,3],[nb,an,3]]){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,size,gl.FLOAT,false,0,0)}gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,verts.length/3)}
let last=performance.now();function loop(t){let dt=Math.min(.05,(t-last)/1000);last=t;if(start.style.display==='none')update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
const touch=document.getElementById('touch'),pad=document.getElementById('movePad'),lookA=document.getElementById('lookArea');let pid=null,px=0,py=0;
pad.addEventListener('pointerdown',e=>{pid=e.pointerId;px=e.clientX;py=e.clientY;pad.setPointerCapture(pid)});pad.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;let dx=e.clientX-px,dy=e.clientY-py;keys.KeyW=dy<-12;keys.KeyS=dy>12;keys.KeyA=dx<-12;keys.KeyD=dx>12});pad.addEventListener('pointerup',()=>{pid=null;keys.KeyW=keys.KeyS=keys.KeyA=keys.KeyD=false});
let lx=0,ly=0;lookA.addEventListener('pointerdown',e=>{lx=e.clientX;ly=e.clientY;lookA.setPointerCapture(e.pointerId)});lookA.addEventListener('pointermove',e=>{if(e.buttons){yaw-=(e.clientX-lx)*.006;pitch-=(e.clientY-ly)*.006;pitch=Math.max(-1.5,Math.min(1.5,pitch));lx=e.clientX;ly=e.clientY}});
document.getElementById('breakBtn').onclick=()=>{let h=hit();if(h){set(...h.b,0);build();upload()}};document.getElementById('placeBtn').onclick=()=>{let h=hit();if(h&&h.last){set(...h.last,selected);build();upload()}};document.getElementById('jumpBtn').onclick=()=>{if(grounded)vel[1]=6};

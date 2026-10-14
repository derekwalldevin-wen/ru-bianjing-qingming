// Exact, world-space upward triangles from the displayed ground batches.
// A small spatial index avoids scene-wide raycasting for every walking foot.
export function createTerrainSupport(geometries,cellSize=4,bounds=null){
 const triangles=[],cells=new Map();let references=0;
 for(const geometry of geometries){const p=geometry.attributes.position,index=geometry.index,count=index?index.count:p.count;
  for(let i=0;i<count;i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
   const ax=p.getX(a),ay=p.getY(a),az=p.getZ(a),bx=p.getX(b),by=p.getY(b),bz=p.getZ(b),cx=p.getX(c),cy=p.getY(c),cz=p.getZ(c),dx=bx-ax,dz=bz-az,ex=cx-ax,ez=cz-az,det=dx*ez-dz*ex;
   if(det>=-1e-10)continue;const id=triangles.length,minX=Math.min(ax,bx,cx),maxX=Math.max(ax,bx,cx),minZ=Math.min(az,bz,cz),maxZ=Math.max(az,bz,cz);
   triangles.push([ax,ay,az,bx,by,bz,cx,cy,cz,dx,dz,ex,ez,1/det,minX,maxX,minZ,maxZ]);
   for(let x=Math.floor(Math.max(minX,bounds?.minX??-Infinity)/cellSize);x<=Math.floor(Math.min(maxX,bounds?.maxX??Infinity)/cellSize);x++)for(let z=Math.floor(Math.max(minZ,bounds?.minZ??-Infinity)/cellSize);z<=Math.floor(Math.min(maxZ,bounds?.maxZ??Infinity)/cellSize);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(id);references++;}
  }
 }
 const data=new Float64Array(triangles.flat()),STRIDE=18,EPS=1e-8;
 function height(x,z){let result=-Infinity;const list=cells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize));if(!list)return undefined;
  for(const id of list){const o=id*STRIDE;if(x<data[o+14]-EPS||x>data[o+15]+EPS||z<data[o+16]-EPS||z>data[o+17]+EPS)continue;
   const px=x-data[o],pz=z-data[o+2],u=(px*data[o+12]-pz*data[o+11])*data[o+13],v=(data[o+9]*pz-data[o+10]*px)*data[o+13];
   if(u>=-EPS&&v>=-EPS&&u+v<=1+EPS)result=Math.max(result,data[o+1]+u*(data[o+4]-data[o+1])+v*(data[o+7]-data[o+1]));
  }return Number.isFinite(result)?result:undefined;
 }
 // Greatest ground height relative to a sole plane over a convex polygon,
 // including small stones between corner probes. For two convex polygons an
 // affine maximum occurs at a vertex or an edge intersection.
 function clearance(probes){
  const q=probes,a=q[0],last=q[q.length-1],ux=q[1].x-a.x,uz=q[1].z-a.z,vx=last.x-a.x,vz=last.z-a.z,det=ux*vz-uz*vx;if(Math.abs(det)<1e-12)return -Infinity;
  const minX=Math.min(...q.map(p=>p.x)),maxX=Math.max(...q.map(p=>p.x)),minZ=Math.min(...q.map(p=>p.z)),maxZ=Math.max(...q.map(p=>p.z)),ids=new Set();
  for(let x=Math.floor(minX/cellSize);x<=Math.floor(maxX/cellSize);x++)for(let z=Math.floor(minZ/cellSize);z<=Math.floor(maxZ/cellSize);z++)for(const id of cells.get(x+','+z)||[])ids.add(id);
  let result=-Infinity;
  for(const id of ids){const o=id*STRIDE;if(maxX<data[o+14]||minX>data[o+15]||maxZ<data[o+16]||minZ>data[o+17])continue;
   for(const p of q){const px=p.x-data[o],pz=p.z-data[o+2],u=(px*data[o+12]-pz*data[o+11])*data[o+13],v=(data[o+9]*pz-data[o+10]*px)*data[o+13];if(u>=-EPS&&v>=-EPS&&u+v<=1+EPS)result=Math.max(result,data[o+1]+u*(data[o+4]-data[o+1])+v*(data[o+7]-data[o+1])-p.y);}
   for(let j=0;j<3;j++){const t=o+j*3,px=data[t]-a.x,pz=data[t+2]-a.z,u=(px*vz-pz*vx)/det,v=(ux*pz-uz*px)/det;let inside=true;for(let k=0;k<q.length;k++){const p=q[k],r=q[(k+1)%q.length];if(((r.x-p.x)*(data[t+2]-p.z)-(r.z-p.z)*(data[t]-p.x))*Math.sign(det)<-EPS){inside=false;break;}}if(inside)result=Math.max(result,data[t+1]-a.y-u*(q[1].y-a.y)-v*(last.y-a.y));}
   for(let j=0;j<3;j++){const t=o+j*3,n=o+(j+1)%3*3,tx=data[n]-data[t],tz=data[n+2]-data[t+2];
    for(let k=0;k<q.length;k++){const p=q[k],r=q[(k+1)%q.length],rx=r.x-p.x,rz=r.z-p.z,den=tx*rz-tz*rx;if(Math.abs(den)<1e-12)continue;const px=p.x-data[t],pz=p.z-data[t+2],u=(px*rz-pz*rx)/den,v=(px*tz-pz*tx)/den;
     if(u>=-EPS&&u<=1+EPS&&v>=-EPS&&v<=1+EPS)result=Math.max(result,data[t+1]+u*(data[n+1]-data[t+1])-p.y-v*(r.y-p.y));
    }
   }
  }return result;
 }
 // Transform each unique shoe vertex once and test each shared edge once,
 // rather than repeating a spatial lookup for every tiny shoe triangle.
 function clearanceMesh(surface,matrix){
  const source=surface.vertices,v=surface.world,e=matrix.elements;let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,minY=Infinity,lowest=0;
  for(let i=0;i<source.length;i+=3){const x=source[i],y=source[i+1],z=source[i+2];v[i]=e[0]*x+e[4]*y+e[8]*z+e[12];v[i+1]=e[1]*x+e[5]*y+e[9]*z+e[13];v[i+2]=e[2]*x+e[6]*y+e[10]*z+e[14];minX=Math.min(minX,v[i]);maxX=Math.max(maxX,v[i]);minZ=Math.min(minZ,v[i+2]);maxZ=Math.max(maxZ,v[i+2]);if(v[i+1]<minY){minY=v[i+1];lowest=i;}}
  const ids=new Set();for(let x=Math.floor(minX/cellSize);x<=Math.floor(maxX/cellSize);x++)for(let z=Math.floor(minZ/cellSize);z<=Math.floor(maxZ/cellSize);z++)for(const id of cells.get(x+','+z)||[])ids.add(id);let result=(height(v[lowest],v[lowest+2])??-Infinity)-minY;
  for(const id of ids){const o=id*STRIDE;if(maxX<data[o+14]||minX>data[o+15]||maxZ<data[o+16]||minZ>data[o+17])continue;
   const dy=data[o+4]-data[o+1],ey=data[o+7]-data[o+1],sx=(dy*data[o+12]-ey*data[o+10])*data[o+13],sz=(data[o+9]*ey-data[o+11]*dy)*data[o+13],bound=Math.min(Math.max(data[o+1],data[o+4],data[o+7]),data[o+1]+sx*((sx>=0?maxX:minX)-data[o])+sz*((sz>=0?maxZ:minZ)-data[o+2]));
   if(bound-minY<=result+1e-12)continue;
   for(let i=0;i<v.length;i+=3){const px=v[i]-data[o],pz=v[i+2]-data[o+2],u=(px*data[o+12]-pz*data[o+11])*data[o+13],w=(data[o+9]*pz-data[o+10]*px)*data[o+13];if(u>=-EPS&&w>=-EPS&&u+w<=1+EPS)result=Math.max(result,data[o+1]+u*(data[o+4]-data[o+1])+w*(data[o+7]-data[o+1])-v[i+1]);}
   for(let j=0;j<3;j++){const t=o+j*3,x=data[t],z=data[t+2];if(x<minX-EPS||x>maxX+EPS||z<minZ-EPS||z>maxZ+EPS)continue;
    for(let k=0;k<surface.triangles.length;k+=3){const a=surface.triangles[k]*3,b=surface.triangles[k+1]*3,c=surface.triangles[k+2]*3,dx=v[b]-v[a],dz=v[b+2]-v[a+2],ex=v[c]-v[a],ez=v[c+2]-v[a+2],det=dx*ez-dz*ex;if(Math.abs(det)<1e-12)continue;const px=x-v[a],pz=z-v[a+2],u=(px*ez-pz*ex)/det,w=(dx*pz-dz*px)/det;if(u>=-EPS&&w>=-EPS&&u+w<=1+EPS)result=Math.max(result,data[t+1]-v[a+1]-u*(v[b+1]-v[a+1])-w*(v[c+1]-v[a+1]));}
   }
   for(let j=0;j<3;j++){const t=o+j*3,n=o+(j+1)%3*3;if(Math.max(data[t],data[n])<minX||Math.min(data[t],data[n])>maxX||Math.max(data[t+2],data[n+2])<minZ||Math.min(data[t+2],data[n+2])>maxZ)continue;const tx=data[n]-data[t],tz=data[n+2]-data[t+2];
    for(let k=0;k<surface.edges.length;k+=2){const a=surface.edges[k]*3,b=surface.edges[k+1]*3,rx=v[b]-v[a],rz=v[b+2]-v[a+2],den=tx*rz-tz*rx;if(Math.abs(den)<1e-12)continue;const px=v[a]-data[t],pz=v[a+2]-data[t+2],u=(px*rz-pz*rx)/den,w=(px*tz-pz*tx)/den;if(u>=-EPS&&u<=1+EPS&&w>=-EPS&&w<=1+EPS)result=Math.max(result,data[t+1]+u*(data[n+1]-data[t+1])-v[a+1]-w*(v[b+1]-v[a+1]));}
   }
  }return result;
 }
 const stats={triangles:triangles.length,cells:cells.size,references,triangleBytes:data.byteLength};triangles.length=0;
 return {height,clearance,clearanceMesh,stats};
}

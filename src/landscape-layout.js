// Art-directed expansion, not a geographic reconstruction of Kaifeng.
export const landscapeBounds={walkX:180,walkZ:104,canalEnd:620,horizon:1150};
export function canalCenter(x){
 const t=Math.max(0,Math.abs(x)-135);
 return Math.sign(x)*(t*t/(t+180)*.39+Math.sin(t/130)*t/(t+90)*26);
}
export function canalHalfWidth(x){return 10.25+Math.max(0,Math.abs(x)-145)*.027;}
export function bankHeight(x,z){
 const center=canalCenter(x),distance=Math.abs(z-center),side=Math.sign(z-center)||1;
 if(distance<canalHalfWidth(x)+.36)return .04;
 if(Math.abs(x)<=127.5&&Math.abs(z)<87)return .57+.05*Math.max(0,Math.min(1,(Math.abs(z)-83.48)/3.52));
 if(distance<=130)return .62;
 const outer=290+32*Math.sin(x*.009+side);return .62-.42*Math.max(0,Math.min(1,(distance-130)/(outer-130)));
}
export function expandedWalkBounds(x,z){
 return Math.abs(x)<=landscapeBounds.walkX&&Math.abs(z)<=landscapeBounds.walkZ&&Math.abs(z-canalCenter(x))>=canalHalfWidth(x)+1.55;
}

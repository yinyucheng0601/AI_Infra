# Independent matrix identities and finite-difference check; no rendering implementation imported.
import random
rng=random.Random(11)
def matrix(r,c): return [[rng.uniform(-1,1) for _ in range(c)] for _ in range(r)]
def tr(a): return list(map(list,zip(*a)))
def mm(a,b): return [[sum(x*y for x,y in zip(row,col)) for col in zip(*b)] for row in a]
def cols(a,start,end): return [r[start:end] for r in a]
def close(a,b):
    assert len(a)==len(b) and len(a[0])==len(b[0])
    assert max(abs(x-y) for r,s in zip(a,b) for x,y in zip(r,s))<1e-10
x,w,dy=matrix(8,8),matrix(8,16),matrix(8,16)
dx,dw=mm(dy,tr(w)),mm(tr(x),dy)
for tp in (1,2,4):
    width=16//tp
    partials=[mm(cols(dy,r*width,(r+1)*width),tr(cols(w,r*width,(r+1)*width))) for r in range(tp)]
    close(dx,[[sum(p[i][j] for p in partials) for j in range(8)] for i in range(8)])
    for r in range(tp): close(cols(dw,r*width,(r+1)*width),mm(tr(x),cols(dy,r*width,(r+1)*width)))
    # AG concatenates token rows; RS(sum) selects row slices of the reduced contribution.
    gathered=sum([x[r*(8//tp):(r+1)*(8//tp)] for r in range(tp)],[])
    close(x,gathered)
    close(dx,sum([[[sum(p[i][j] for p in partials) for j in range(8)] for i in range(r*(8//tp),(r+1)*(8//tp))] for r in range(tp)],[]))
def loss(a,b): return sum(v*g for row,grow in zip(mm(a,b),dy) for v,g in zip(row,grow))
eps=1e-6
for i,j in [(0,0),(3,7)]:
    x[i][j]+=eps;plus=loss(x,w);x[i][j]-=2*eps;minus=loss(x,w);x[i][j]+=eps
    assert abs((plus-minus)/(2*eps)-dx[i][j])<1e-7
for i,j in [(0,0),(7,15)]:
    w[i][j]+=eps;plus=loss(x,w);w[i][j]-=2*eps;minus=loss(x,w);w[i][j]+=eps
    assert abs((plus-minus)/(2*eps)-dw[i][j])<1e-7
print('PASS: dX / dW finite differences; TP1/2/4 gradient contributions, AG rows and RS(sum) slices')

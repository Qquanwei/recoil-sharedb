recoil-sharedb

RecoilSharedb 是一个 Recoil 的 RecoilSync 实现，简单地说它可以将你的 Recoil 原子自动与远程数据库进行同步（mongodb），只需要很少量的代码。

例如, 当使用了RecoilShareDB之后, 我们对特定的 atom 进行修改

```javascript

function Counter() {
  const [count, setCount] = useRecoilState(countAtom);

  return (
    <div>{ count } </div>
  )
}

```

会自动存储到数据库中，对于使用者仅仅是上面的代码。如果写入失败，例如网络错误，也能通过异常回调监控到。同时，所有使用了同一个 `key` 的 atom，即使在多台计算机上，也能够实时共享修改。

所以使用了 RecoilShareDB 后，可以轻松创建一个网络多人协作应用。

例如 https://gante.link 网站，即是使用此作为基础创建。


快速使用

由于 sharedb 是一个全栈框架，所以使用这个库需要一个sharedb服务，下面的代码可以快速启动一个无数据库版本的服务，如果需要数据库存储可以根据 sharedb-mongo 相关文档操作。

服务代码

```js
const http = require('http');
const ShareDB = require('sharedb');
const koa = require('koa');
const json1 = require('ot-json1');
const WebSocketJSONStream = require('@teamwork/websocket-json-stream');
const { WebSocketServer } = require('ws');

const app = new koa();

const server = http.createServer(app.callback());
const wsServer = new WebSocketServer({ server });
ShareDB.types.register(json1.type);

const backend = new ShareDB();

wsServer.on('connection', (socket) => {
    const stream = new WebSocketJSONStream(socket);
    backend.listen(stream);
});

server.listen({
    host: '0.0.0.0',
    port: 9081
}, () => {
    console.log('start');
});
```


启动服务之后，在React工程内开启同步，仅仅需要下面的代码

```js
import { RecoilRoot, atom, useRecoilState } from 'recoil';
import { RecoilSyncShareDB, effect } from 'recoil-sharedb';
import * as refine from '@recoiljs/refine';

const iptValueAtom = atom({
    key: 'ipt value',
    default: 'input some character',
    effects: [
        effect('this-collection', 'item-id', {
            refine: refine.string()
        })
    ]
})
function MyComponent() {
    const [iptValue, setIptValue] = useRecoilState(iptValueAtom);

    return (
        <div>
            <input style={{ padding: '2px 5px', margin: '20px'}}
             type="text"
             value={iptValue}
             onChange={e => setIptValue(e.target.value)} />
        </div>
    );
}

function App() {
  return (
      <RecoilRoot>
          <RecoilSyncShareDB wsUrl="ws://localhost:9081">
              <MyComponent />
          </RecoilSyncShareDB>
      </RecoilRoot>
  );
}

export default App;
```

之后，就可以在不同设备之间进行同步了。应用层屏蔽了底层细节。

![screen2](https://user-images.githubusercontent.com/9263655/220231953-37b9e12e-3777-40d9-b89f-1174b10a6a15.gif)


在这背后，recoil-sharedb 内部会有一个diff算法， 会将一个大对象，diff成对应的ot修改，这样即使编辑同样一个对象的不同字段，也不会发生冲突。如果两个设备同时编辑一个字段（由于网络非常快，所以这种情况很少发生，但在离线同步时会比较常见），此时会产生合并冲突，RecoilSyncShareDB 提供了一个 onError 回调，需要根据此回调提醒用户刷新应用。

* RecoilSyncShareDB API

| 参数名  | 类型     |                  |
|---------|----------|------------------|
| wsUrl   | string   | 对应的ws服务     |
| onError | function | 当发生异常时触发 |

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

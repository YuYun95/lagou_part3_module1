class Observer {
  constructor(data) {
    this.walk(data)
  }

  // 遍历对象的所有属性，判断传入的 data 对象是否是对象，加强代码健壮性
  walk(data) {
    // 1.判断 data 是否是对象
    if (!data || typeof data !== 'object') {
      return
    }
    // 2.遍历 data 对象的所有属性，调用 defineReactive方法，转化为 getter 和 setter（响应式数据）
    Object.keys(data).forEach(key => {
      this.defineReactive(data, key, data[key])
    })
  }

  // 把属性转为getter 和 setter
  // 第三个参数直接把值传入，而不是在内部通过data[key]获取值？
  // 因为访问实例属性时，首先触发 vue.js 里的 get 方法，这个 get 调用了 data[key]即 $data，因为这里调用了_proxyData方法并且把$data传入，
  // 这里会触发 observer 里的 get 方法，因为实例化了 Observer 类 并且把 $data 传入
  // 如果在 observer 里直接使用 data[key]，则又触发了这个 get 方法，产生一个死递归，会发生堆栈溢出错误
  // 使用了闭包，get 方法引用外部变量，所以当 defineReactive 执行完后 val 没有立即释放，所以可以获取值

  defineReactive(obj, key, val) {
    const that = this
    // 负责收集依赖，并发送通知
    let dep = new Dep()

    // 如果val是对象，把 val内部的属性转为响应式数据
    this.walk(val)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 收集依赖
        Dep.target && dep.addSub(Dep.target)
        return val
      },
      set(newValue) {
        if (newValue === val) {
          return
        }
        val = newValue
        // 判断新值是否是对象类型，如果是就把属性转为响应式
        that.walk(newValue)
        // 发送通知
        dep.notify()
      }
    })
  }
}

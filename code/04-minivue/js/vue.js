class Vue {
  constructor(options) {
    // 1.通过属性保存选项数据
    this.$options = options || {}
    this.$data = options.data || {}
    this.$methods = options.methods || {}
    this.$el = typeof options.el === 'string' ? document.querySelector(options.el) : options.el
    // 2.把 data 中的成员转换为 getter 和 setter，注入到 vue 实例中
    this._proxyData(this.$data)
    this._injectionMethods(this.$methods)
    // 3.调用 observer 对象，监听数据的变化
    new Observer(this.$data)
    // 4.调用compiler对象，解析指令和差值表达式
    new Compiler(this)
  }

  // 代理数据
  _proxyData(data) {
    // 遍历 data 中的所有属性
    Object.keys(data).forEach(key => { // 普通函数 this 指向 window
      // 把 data 中的属性注入到 Vue 实例中
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get() {
          return data[key]
        },
        set(newValue) {
          if (newValue === data[key]) {
            return
          }
          data[key] = newValue
        }
      })
    })
  }

  // 把methods注入vue实例
  _injectionMethods(methods) {
    Object.keys(methods).forEach(fnName => {
      this[fnName] = this.$methods[fnName]
    })
  }
}

---
title: 挂载阶段
---

## 1. 前言

模板编译阶段完成之后，接下来就进入了挂载阶段，从官方文档给出的生命周期流程图中可以看到，挂载阶段所做的主要工作是创建`Vue`实例并用其替换`el`选项对应的`DOM`元素，同时还要开启对模板中数据（状态）的监控，当数据（状态）发生变化时通知其依赖进行视图更新。

![](~@/lifecycle/4.png)


## 2. 挂载阶段分析

在上篇文章介绍模板编译阶段中我们说过，在完整版本的`$mount`方法中将模板编译完成之后，会回过头去调只包含运行时版本的`$mount`方法进入挂载阶段，所以要想分析挂载阶段我们必须从只包含运行时版本的`$mount`方法入手。

只包含运行时版本的`$mount`代码如下：

```javascript
Vue.prototype.$mount = function (el,hydrating) {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el, hydrating)
};
```

可以看到，在该函数内部首先获取到`el`选项对应的`DOM`元素，然后调用`mountComponent`函数并将`el`选项对应的`DOM`元素传入，进入挂载阶段。那么，下面我们来看下`mountComponent`函数内部都干了些什么。

`mountComponent`函数的定义位于源码的`src/core/instance/lifecycle.js`中，如下：

```javascript
export function mountComponent (vm,el,hydrating) {
    vm.$el = el
    if (!vm.$options.render) {
        vm.$options.render = createEmptyVNode
    }
    callHook(vm, 'beforeMount')

    let updateComponent

    updateComponent = () => {
        vm._update(vm._render(), hydrating)
    }
    new Watcher(vm, updateComponent, noop, {
        before () {
            if (vm._isMounted) {
                callHook(vm, 'beforeUpdate')
            }
        }
    }, true /* isRenderWatcher */)
    hydrating = false

    if (vm.$vnode == null) {
        vm._isMounted = true
        callHook(vm, 'mounted')
    }
    return vm
}
```

可以看到，在该函数中，首先会判断实例上是否存在渲染函数，如果不存在，则设置一个默认的渲染函数`createEmptyVNode`，该渲染函数会创建一个注释类型的`VNode`节点。如下：

```javascript
vm.$el = el
if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
}
```



然后调用`callHook`函数来触发`beforeMount`生命周期钩子函数，如下：

```javascript
callHook(vm, 'beforeMount')
```



该钩子函数触发后标志着正式开始执行挂载操作。

接下来定义了一个`updateComponent`函数，如下：

```javascript
updateComponent = () => {
    vm._update(vm._render(), hydrating)
}
```

在该函数内部，首先执行渲染函数`vm._render()`得到一份最新的`VNode`节点树，然后执行` vm._update()`方法对最新的`VNode`节点树与上一次渲染的旧`VNode`节点树进行对比并更新`DOM`节点(即`patch`操作)，完成一次渲染。

也就是说，如果调用了`updateComponent`函数，就会将最新的模板内容渲染到视图页面中，这样就完成了挂载操作的一半工作，即图中的上半部分：

![](~@/lifecycle/5.png)




为什么说是完成了一半操作呢？这是因为在挂载阶段不但要将模板渲染到视图中，同时还要开启对模板中数据（状态）的监控，当数据（状态）发生变化时通知其依赖进行视图更新。即图中的下半部分：

![](~@/lifecycle/6.png)


继续往下看，接下来创建了一个`Watcher`实例，并将定义好的`updateComponent`函数传入。要想开启对模板中数据（状态）的监控，这一段代码是关键，如下：

```javascript
new Watcher(
    vm,                    // 第一个参数
    updateComponent,       // 第二个参数
    noop,                  // 第三个参数
    {                      // 第四个参数
        before () {
          if (vm._isMounted) {
            callHook(vm, 'beforeUpdate')
          }
        }
	},
    true                    // 第五个参数
)
```

可以看到，在创建`Watcher`实例的时候，传入的第二个参数是`updateComponent`函数。回顾一下我们在数据侦测篇文章中介绍`Watcher`类的时候，`Watcher`类构造函数的第二个参数支持两种类型：函数和数据路径（如`a.b.c`）。如果是数据路径，会根据路径去读取这个数据；如果是函数，会执行这个函数。一旦读取了数据或者执行了函数，就会触发数据或者函数内数据的`getter`方法，而在`getter`方法中会将`watcher`实例添加到该数据的依赖列表中，当该数据发生变化时就会通知依赖列表中所有的依赖，依赖接收到通知后就会调用第四个参数回调函数去更新视图。

换句话说，上面代码中把`updateComponent`函数作为第二个参数传给`Watcher`类从而创建了`watcher`实例，那么`updateComponent`函数中读取的所有数据都将被`watcher`所监控，这些数据中只要有任何一个发生了变化，那么`watcher`都将会得到通知，从而会去调用第四个参数回调函数去更新视图，如此反复，直到实例被销毁。



这样就完成了挂载阶段的另一半工作。

如此之后，挂载阶段才算是全部完成了，接下来调用挂载完成的生命周期钩子函数`mounted`。

## 3. 总结

本篇文章介绍了生命周期中的第三个阶段——挂载阶段。

在该阶段中所做的主要工作是创建`Vue`实例并用其替换`el`选项对应的`DOM`元素，同时还要开启对模板中数据（状态）的监控，当数据（状态）发生变化时通知其依赖进行视图更新。

我们将挂载阶段所做的工作分成两部分进行了分析，第一部分是将模板渲染到视图上，第二部分是开启对模板中数据（状态）的监控。两部分工作都完成以后挂载阶段才算真正的完成了。


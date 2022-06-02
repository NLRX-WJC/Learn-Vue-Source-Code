---
title: 自定义指令
---

## 1. 前言

在`Vue`中，除了`Vue`本身为我们提供的一些内置指令之外，`Vue`还支持用户自定义指令。并且用户有两种定义指令的方式：一种是使用全局API——`Vue.directive`来定义全局指令，这种方式定义的指令会被存放在`Vue.options['directives']`中；另一种是在组件内的`directive`选项中定义专为该组件使用的局部指令，这种方式定义的指令会被存放在`vm.$options['directives']`中。

可以看到，无论是使用哪一种方式定义的指令它都是将定义好的指令存放在指定的地方，而并不能让指令生效。那么定义的指令什么时候才会生效呢？或者说它是如何生效的呢？本篇文章就来带你探究自定义指令如何生效的内部原理。



## 2. 何时生效

我们知道，指令是作为标签属性写在模板中的`HTML`标签上的，那么又回到那句老话了，既然是写在模板中的，那它必然会经过模板编译，编译之后会产生虚拟`DOM`，在虚拟`DOM`渲染更新时，除了更新节点的内容之外，节点上的一些指令、事件等内容也需要更新。另外，我们还知道，虚拟`DOM`节点的更新不只是更新一个已有的节点，也有可能是创建一个新的节点，还有可能是删除一个节点等等，这些都叫做虚拟`DOM`节点的更新，那么既然虚拟`DOM`节点更新的概念这么大，那到底该什么时候处理指令的相关逻辑，执行指令函数，让指令生效呢？

其实，在虚拟`DOM`渲染更新的时候，它在执行相关操作的同时，还会在每个阶段触发相应的钩子函数，我们只需监听不同的钩子函数，就可以在虚拟`DOM`渲染更新的不同阶段做一些额外的事情。下表给出了虚拟`DOM`在渲染更新的不同阶段所触发的不同的钩子函数及其触发时机：

| 钩子函数名称 | 触发时机                                                     | 回调参数              |
| ------------ | ------------------------------------------------------------ | --------------------- |
| init         | 已创建VNode，在patch期间发现新的虚拟节点时被触发             | VNode                 |
| create       | 已基于VNode创建了DOM元素                                     | emptyNode和VNode      |
| activate     | keep-alive组件被创建                                         | emptyNode和innerNode  |
| insert       | VNode对应的DOM元素被插入到父节点中时被触发                   | VNode                 |
| prepatch     | 一个VNode即将被patch之前触发                                 | oldVNode和VNode       |
| update       | 一个VNode更新时触发                                          | oldVNode和VNode       |
| postpatch    | 一个VNode被patch完毕时触发                                   | oldVNode和VNode       |
| destory      | 一个VNode对应的DOM元素从DOM中移除时或者它的父元素从DOM中移除时触发 | VNode                 |
| remove       | 一个VNode对应的DOM元素从DOM中移除时触发。与destory不同的是，如果是直接将该VNode的父元素从DOM中移除导致该元素被移除，那么不会触发 | VNode和removeCallback |

所以我们只需在恰当的阶段监听对应的钩子函数来处理指令的相关逻辑，从而就可以使指令生效了。

现在我们来设想一下，在什么阶段处理指令的逻辑会比较合适？仔细想一下，当一个节点被创建成`DOM`元素时，如果这个节点上有指令，那此时得处理指令逻辑，让指令生效；当一个节点被更新时，如果节点更新之前没有指令，而更新之后有了指令，或者是更新前后节点上的指令发生了变化，那此时得处理指令逻辑，让指令生效；另外，当节点被移除时，那节点上的指令自然也就没有用了，此时还得处理指令逻辑。

基于以上设想，我们得出一个结论：在虚拟`DOM`渲染更新的`create`、`update`、`destory`阶段都得处理指令逻辑，所以我们需要监听这三个钩子函数来处理指令逻辑。事实上，`Vue`也是这么做的，代码如下：

```javascript
export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}
```

可以看到，分别监听了这三个钩子函数，当虚拟`DOM`渲染更新的时候会触发这三个钩子函数，从而就会执行`updateDirectives`函数，在该函数内部就会去处理指令的相关逻辑，我们在下面会详细分析该函数内部是如何处理指令逻辑。

## 3. 指令钩子函数

`Vue`对于自定义指令定义对象提供了几个钩子函数，这几个钩子函数分别对应着指令的几种状态，一个指令从第一次被绑定到元素上到最终与被绑定的元素解绑，它会经过以下几种状态：

- bind：只调用一次，指令第一次绑定到元素时调用。在这里可以进行一次性的初始化设置。
- inserted：被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。
- update：所在组件的 VNode 更新时调用，**但是可能发生在其子 VNode 更新之前**。
- componentUpdated：指令所在组件的 VNode **及其子 VNode** 全部更新后调用。
- unbind：只调用一次，指令与元素解绑时调用。

有了每个状态的钩子函数，这样我们就可以让指令在不同状态下做不同的事情。

例如，我们想让指令所绑定的输入框一插入到 DOM 中，输入框就获得焦点，那么，我们就可以这样定义指令:

```javascript
// 注册一个全局自定义指令 `v-focus`
Vue.directive('focus', {
    // 当被绑定的元素插入到 DOM 中时……
    inserted: function (el) {
        // 聚焦元素
        el.focus()
    }
})
```

在模板中使用该指令，如下：

```html
<input v-focus>
```

可以看到，我们在定义该指令的时候，我们将获取焦点的逻辑写在了`inserted`钩子函数里面，这样就保证了当被绑定的元素插入到父节点时，获取焦点的逻辑就会被执行。

同理，我们也可以在一个指令中设置多个钩子函数，从而让一个指令在不同状态下做不同的事。

OK，有了这个概念之后，接下来我们就来分析指令是如何生效的。

## 4. 如何生效

在第二章节中我们知道了，当虚拟`DOM`渲染更新的时候会触发`create`、`update`、`destory`这三个钩子函数，从而就会执行`updateDirectives`函数来处理指令的相关逻辑，执行指令函数，让指令生效。所以，探究指令如何生效的问题就是分析`updateDirectives`函数的内部逻辑。

`updateDirectives`函数的定义位于源码的`src/core/vdom/modules/directives.js`文件中，如下：

```javascript
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (oldVnode.data.directives || vnode.data.directives) {
    _update(oldVnode, vnode)
  }
}
```

可以看到，该函数的内部是判断了如果新旧`VNode`中只要有一方涉及到了指令，那就调用`_update`方法去处理指令逻辑。

`_update`方法定义如下：

```javascript
function _update (oldVnode, vnode) {
  const isCreate = oldVnode === emptyNode
  const isDestroy = vnode === emptyNode
  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

  const dirsWithInsert = []
  const dirsWithPostpatch = []

  let key, oldDir, dir
  for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
    if (!oldDir) {
      // new directive, bind
      callHook(dir, 'bind', vnode, oldVnode)
      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
      }
    } else {
      // existing directive, update
      dir.oldValue = oldDir.value
      dir.oldArg = oldDir.arg
      callHook(dir, 'update', vnode, oldVnode)
      if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
      }
    }
  }

  if (dirsWithInsert.length) {
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}
```



可以看到，该方法内首先定义了一些变量，如下：

```javascript
const isCreate = oldVnode === emptyNode
const isDestroy = vnode === emptyNode
const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context)
const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)

const dirsWithInsert = []
const dirsWithPostpatch = []
```

- isCreate:判断当前节点`vnode`对应的旧节点`oldVnode`是不是一个空节点，如果是的话，表明当前节点是一个新创建的节点。
- isDestroy:判断当前节点`vnode`是不是一个空节点，如果是的话，表明当前节点对应的旧节点将要被销毁。
- oldDirs:旧的指令集合，即`oldVnode`中保存的指令。
- newDirs:新的指令集合，即`vnode`中保存的指令。
- dirsWithInsert:保存需要触发`inserted`指令钩子函数的指令列表。
- dirsWithPostpatch:保存需要触发`componentUpdated`指令钩子函数的指令列表。

另外，你可能还看到了在定义新旧指令集合的变量中调用了`normalizeDirectives`函数，其实该函数是用来模板中使用到的指令从存放指令的地方取出来，并将其格式进行统一化，其定义如下：

```javascript
function normalizeDirectives (dirs,vm):  {
  const res = Object.create(null)
  if (!dirs) {
    return res
  }
  let i, dir
  for (i = 0; i < dirs.length; i++) {
    dir = dirs[i]
    if (!dir.modifiers) {
      dir.modifiers = emptyModifiers
    }
    res[getRawDirName(dir)] = dir
    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true)
  }
  return res
}
```

以第三章节中的`v-focus`指令为例，通过`normalizeDirectives`函数取出的指令会变成如下样子：

```javascript
{
    'v-focus':{
        name : 'focus' ,  // 指令的名称
        value : '',       // 指令的值
        arg:'',           // 指令的参数
        modifiers:{},     // 指令的修饰符
        def:{
            inserted:fn
        }
    }
}
```



OK,言归正传，获取到`oldDirs`和`newDirs`之后，接下来要做的事情就是对比这两个指令集合并触发对应的指令钩子函数。

首先，循环`newDirs`，并分别从`oldDirs`和`newDirs`取出当前循环到的指令分别保存在变量`oldDir`和` dir`中，如下：

```javascript
let key, oldDir, dir
for (key in newDirs) {
    oldDir = oldDirs[key]
    dir = newDirs[key]
}
```

然后判断当前循环到的指令名`key`在旧的指令列表`oldDirs`中是否存在，如果不存在，说明该指令是首次绑定到元素上的一个新指令，此时调用`callHook`触发指令中的`bind`钩子函数，接着判断如果该新指令在定义时设置了`inserted`钩子函数，那么将该指令添加到`dirsWithInsert`中，以保证执行完所有指令的`bind`钩子函数后再执行指令的`inserted`钩子函数，如下：

```javascript
// 判断当前循环到的指令名`key`在旧的指令列表`oldDirs`中是否存在，如果不存在，那么说明这是一个新的指令
if (!oldDir) {
    // new directive, bind
    // 触发指令中的`bind`钩子函数
    callHook(dir, 'bind', vnode, oldVnode)
    // 如果定义了inserted 时的钩子函数 那么将该指令添加到dirsWithInsert中
    if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir)
    }
}
```

如果当前循环到的指令名`key`在旧的指令列表`oldDirs`中存在时，说明该指令在之前已经绑定过了，那么这一次的操作应该是更新指令。

首先，在`dir`上添加`oldValue`属性和`oldArg`属性，用来保存上一次指令的`value`属性值和`arg`属性值，然后调用`callHook`触发指令中的`update`钩子函数，接着判断如果该指令在定义时设置了`componentUpdated`钩子函数，那么将该指令添加到`dirsWithPostpatch`中，以保证让指令所在的组件的`VNode`及其子`VNode`全部更新完后再执行指令的`componentUpdated`钩子函数，如下：

```javascript
else {
    // existing directive, update
    dir.oldValue = oldDir.value
    dir.oldArg = oldDir.arg
    callHook(dir, 'update', vnode, oldVnode)
    if (dir.def && dir.def.componentUpdated) {
        dirsWithPostpatch.push(dir)
    }
}
```

最后，判断`dirsWithInsert`数组中是否有元素，如果有，则循环`dirsWithInsert`数组，依次执行每一个指令的`inserted`钩子函数，如下：

```javascript
if (dirsWithInsert.length) {
    const callInsert = () => {
        for (let i = 0; i < dirsWithInsert.length; i++) {
            callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
        }
    }
}
```

从上述代码中可以看到，并没有直接去循环执行每一个指令的`inserted`钩子函数，而是新创建了一个`callInsert`函数，当执行该函数的时候才会去循环执行每一个指令的`inserted`钩子函数。这又是为什么呢？

这是因为指令的`inserted`钩子函数必须在被绑定元素插入到父节点时调用，那么如果是一个新增的节点，如何保证它已经被插入到父节点了呢？我们之前说过，虚拟`DOM`在渲染更新的不同阶段会触发不同的钩子函数，比如当`DOM`节点在被插入到父节点时会触发`insert`函数，那么我们就知道了，当虚拟`DOM`渲染更新的`insert`钩子函数被调用的时候就标志着当前节点已经被插入到父节点了，所以我们要在虚拟`DOM`渲染更新的`insert`钩子函数内执行指令的`inserted`钩子函数。也就是说，当一个新创建的元素被插入到父节点中时**虚拟`DOM`渲染更新的`insert`钩子函数**和**指令的`inserted`钩子函数**都要被触发。既然如此，那就可以把这两个钩子函数通过调用`mergeVNodeHook`方法进行合并，然后统一在虚拟`DOM`渲染更新的`insert`钩子函数中触发，这样就保证了元素确实被插入到父节点中才执行的指令的`inserted`钩子函数，如下：

```javascript
if (dirsWithInsert.length) {
    const callInsert = () => {
        for (let i = 0; i < dirsWithInsert.length; i++) {
            callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
        }
    }
    if (isCreate) {
        mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
        callInsert()
    }
}
```

同理，我们也需要保证指令所在的组件的`VNode`及其子`VNode`全部更新完后再执行指令的`componentUpdated`钩子函数，所以我们将虚拟`DOM`渲染更新的`postpatch`钩子函数和指令的`componentUpdated`钩子函数进行合并触发，如下：

```javascript
if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
        for (let i = 0; i < dirsWithPostpatch.length; i++) {
            callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
        }
    })
}
```

最后，当`newDirs`循环完毕后，再循环`oldDirs`，如果某个指令存在于旧的指令列表`oldDirs`而在新的指令列表`newDirs`中不存在，那说明该指令是被废弃的，所以则触发指令的`unbind`钩子函数对指令进行解绑。如下：

```javascript
if (!isCreate) {
    for (key in oldDirs) {
        if (!newDirs[key]) {
            // no longer present, unbind
            callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
        }
    }
}
```

以上就是指令生效的全部逻辑。所谓让指令生效，其实就是在合适的时机执行定义指令时所设置的钩子函数。

## 5. 总结

本篇文章介绍了关于自定义指令如何生效的相关内容。

首先，我们知道了如果一个`DOM`节点上绑定了指令，那么在这个`DOM`节点所对应虚拟`DOM`节点进行渲染更新的时候，不但会处理节点渲染更新的逻辑，还会处理节点上指令的相关逻辑。具体处理指令逻辑的时机是在虚拟`DOM`渲染更新的`create`、`update`、`destory`阶段。

接着，我们介绍了`Vue`对于自定义指令定义对象提供了几个钩子函数，这几个钩子函数分别对应着指令的几种状态，我们可以根据实际的需求将指令逻辑写在合适的指令状态钩子函数中，比如，我们想让指令所绑定的元素一插入到`DOM`中就执行指令逻辑，那我们就应该把指令逻辑写在指令的`inserted`钩子函数中。

接着，我们逐行分析了`updateDirectives`函数，在该函数中就是对比新旧两份`VNode`上的指令列表，通过对比的异同点从而执行指令不同的钩子函数，让指令生效。

最后，一句话概括就是：**所谓让指令生效，其实就是在合适的时机执行定义指令时所设置的钩子函数。**
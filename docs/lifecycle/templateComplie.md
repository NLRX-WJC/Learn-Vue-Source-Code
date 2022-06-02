---
title: 模板编译阶段
---

## 1. 前言

前几篇文章中我们介绍了生命周期的初始化阶段，我们知道，在初始化阶段各项工作做完之后调用了`vm.$mount`方法，该方法的调用标志着初始化阶段的结束和进入下一个阶段，从官方文档给出的生命周期流程图中可以看到，下一个阶段就进入了模板编译阶段，该阶段所做的主要工作是获取到用户传入的模板内容并将其编译成渲染函数。

![](~@/lifecycle/3.png)


模板编译阶段并不是存在于`Vue`的所有构建版本中，它只存在于完整版（即`vue.js`）中。在只包含运行时版本（即`vue.runtime.js`）中并不存在该阶段，这是因为当使用`vue-loader`或`vueify`时，`*.vue`文件内部的模板会在构建时预编译成渲染函数，所以是不需要编译的，从而不存在模板编译阶段，由上一步的初始化阶段直接进入下一阶段的挂载阶段。

在这里，我们有必要介绍一下什么是完整版和只包含运行时版。

 `vue`基于源码构建的有两个版本，一个是`runtime only`(一个只包含运行时的版本)，另一个是`runtime + compiler`(一个同时包含编译器和运行时的完整版本)。而两个版本的区别仅在于后者包含了一个编译器。

- 完整版本

  一个完整的`Vue`版本是包含编译器的，我们可以使用`template`选项进行模板编写。编译器会自动将`template`选项中的模板字符串编译成渲染函数的代码,源码中就是`render`函数。如果你需要在客户端编译模板 (比如传入一个字符串给 `template` 选项，或挂载到一个元素上并以其 `DOM` 内部的 HTML 作为模板)，就需要一个包含编译器的版本。 如下：

  ```javascript
  // 需要编译器的版本
  new Vue({
    template: '<div>{{ hi }}</div>'
  })
  ```

- 只包含运行时版本

  只包含运行时的版本拥有创建`Vue`实例、渲染并处理`Virtual DOM`等功能，基本上就是除去编译器外的完整代码。该版本的适用场景有两种：

  1.我们在选项中通过手写`render`函数去定义渲染过程，这个时候并不需要包含编译器的版本便可完整执行。

  ```javascript
  // 不需要编译器
  new Vue({
    render (h) {
      return h('div', this.hi)
    }
  })
  ```

   2.借助`vue-loader`这样的编译工具进行编译，当我们利用`webpack`进行`Vue`的工程化开发时，常常会利用`vue-loader`对`*.vue`文件进行编译，尽管我们也是利用`template`模板标签去书写代码，但是此时的`Vue`已经不需要利用编译器去负责模板的编译工作了，这个过程交给了插件去实现。

很明显，编译过程对性能会造成一定的损耗，并且由于加入了编译的流程代码，`Vue`代码的总体积也更加庞大(运行时版本相比完整版体积要小大约 30%)。因此在实际开发中，我们需要借助像`webpack`的`vue-loader`这类工具进行编译，将`Vue`对模板的编译阶段合并到`webpack`的构建流程中，这样不仅减少了生产环境代码的体积，也大大提高了运行时的性能，一举两得。

为了完整的学习源码，本篇文章将会分析完整版中的模板编译阶段到底做了些什么。

## 2. 模板编译阶段分析

上文中说了，完整版和只包含运行时版之间的差异主要在于是否有模板编译阶段，而是否有模板编译阶段主要表现在`vm.$mount`方法的实现上。此时你可能会有疑问：照这么说，`$mount`方法也有两个版本？对的，你可以这么理解，但归根结底来说还是一种。我们分别来看一下。

### 2.1 两种$mount方法对比

只包含运行时版本的`$mount`代码如下：

```javascript
Vue.prototype.$mount = function (el,hydrating) {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el, hydrating)
};
```

在该版本中的`$mount`方法内部获取到`el`选项对应的`DOM`元素后直接调用`mountComponent`函数进行挂载操作，关于该函数我们会在挂载阶段详细介绍。

而完整版本的`$mount`代码如下：

```javascript
var mount = Vue.prototype.$mount;
Vue.prototype.$mount = function (el,hydrating) {
  // 省略获取模板及编译代码

  return mount.call(this, el, hydrating)
}
```

注意，在完整版本的`$mount`定义之前，先将`Vue`原型上的`$mount`方法先缓存起来，记作变量`mount`。此时你可能会问了，这`$mount`方法还没定义呢，怎么先缓存起来了。

其实在源码中，是先定义只包含运行时版本的`$mount`方法，再定义完整版本的`$mount`方法，所以此时缓存的`mount`变量就是只包含运行时版本的`$mount`方法。

为什么要这么做呢？上文我们说了，完整版本和只包含运行时版本之间的差异主要在于是否有模板编译阶段，只包含运行时版本没有模板编译阶段，初始化阶段完成后直接进入挂载阶段，而完整版本是初始化阶段完成后进入模板编译阶段，然后再进入挂载阶段。也就是说，这两个版本最终都会进入挂载阶段。所以在完整版本的`$mount`方法中将模板编译完成后需要回头去调只包含运行时版本的`$mount`方法以进入挂载阶段。

这也就是在完整版本的`$mount`方法中先把只包含运行时版本的`$mount`方法缓存下来，记作变量`mount`，然后等模板编译完成，再执行`mount`方法（即只包含运行时版本的`$mount`方法）。

所以分析模板编译阶段其实就是分析完整版的`vm.$mount`方法的实现。

### 2.2 完整版的vm.$mount方法分析

完整版的`vm.$mount`方法定义位于源码的`src/platforms/web/entry-runtime-with-compiler.js`中，如下：

```javascript
var mount = Vue.prototype.$mount;
Vue.prototype.$mount = function (el,hydrating) {
  el = el && query(el);
  if (el === document.body || el === document.documentElement) {
    warn(
      "Do not mount Vue to <html> or <body> - mount to normal elements instead."
    );
    return this
  }

  var options = this.$options;
  // resolve template/el and convert to render function
  if (!options.render) {
    var template = options.template;
    if (template) {
      if (typeof template === 'string') {
          if (template.charAt(0) === '#') {
            template = idToTemplate(template);
            /* istanbul ignore if */
            if (!template) {
              warn(
                ("Template element not found or is empty: " + (options.template)),
                this
              );
            }
          }
      } else if (template.nodeType) {
        template = template.innerHTML;
      } else {
        {
          warn('invalid template option:' + template, this);
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el);
    }
    if (template) {
      if (config.performance && mark) {
        mark('compile');
      }

      var ref = compileToFunctions(template, {
        outputSourceRange: "development" !== 'production',
        shouldDecodeNewlines: shouldDecodeNewlines,
        shouldDecodeNewlinesForHref: shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this);
      var render = ref.render;
      var staticRenderFns = ref.staticRenderFns;
      options.render = render;
      options.staticRenderFns = staticRenderFns;

      if (config.performance && mark) {
        mark('compile end');
        measure(("vue " + (this._name) + " compile"), 'compile', 'compile end');
      }
    }
  }
  return mount.call(this, el, hydrating)
};
```

从代码中可以看到，该函数可大致分为三部分：

- 根据传入的`el`参数获取`DOM`元素；
- 在用户没有手写`render`函数的情况下获取传入的模板`template`；
- 将获取到的`template`编译成`render`函数；

接下来我们就逐一分析。

首先，根据传入的`el`参数获取`DOM`元素。如下：

```javascript
el = el && query(el);

function query (el) {
  if (typeof el === 'string') {
    var selected = document.querySelector(el);
    if (!selected) {
      warn(
        'Cannot find element: ' + el
      );
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}
```

由于`el`参数可以是元素，也可以是字符串类型的元素选择器，所以调用`query`函数来获取到`el`对应的`DOM`元素。由于`query`函数比较简单，就是根据传入的`el`参数是否为字符串从而以不同方式获取到对应的`DOM`元素，这里就不逐行展开介绍了。

另外，这里还多了一个判断，就是判断获取到`el`对应的`DOM`元素如果是`body`或`html`元素时，将会抛出警告。这是因为`Vue`会将模板中的内容替换`el`对应的`DOM`元素，如果是`body`或`html`元素时，替换之后将会破坏整个`DOM`文档，所以不允许`el`是`body`或`html`。如下：

```javascript
if (el === document.body || el === document.documentElement) {
  warn(
    "Do not mount Vue to <html> or <body> - mount to normal elements instead."
  );
  return this
}
```



接着，在用户没有手写`render`函数的情况下获取传入的模板`template`；如下：

```javascript
if (!options.render) {
  var template = options.template;
  if (template) {
    if (typeof template === 'string') {
      if (template.charAt(0) === '#') {
        template = idToTemplate(template);
        /* istanbul ignore if */
        if (!template) {
          warn(
            ("Template element not found or is empty: " + (options.template)),
            this
          );
        }
      }
    } else if (template.nodeType) {
        template = template.innerHTML;
    } else {
      {
        warn('invalid template option:' + template, this);
      }
      return this
    }
  } else if (el) {
    template = getOuterHTML(el);
  }
}
```

首先获取用户传入的`template`选项赋给变量`template`，如果变量`template`存在，则接着判断如果`template`是字符串并且以`##`开头，则认为`template`是`id`选择符，则调用`idToTemplate`函数获取到选择符对应的`DOM`元素的`innerHTML`作为模板，如下：

```javascript
if (template) {
  if (typeof template === 'string') {
    if (template.charAt(0) === '#') {
      template = idToTemplate(template);
    }
  }
}

var idToTemplate = cached(function (id) {
  var el = query(id);
  return el && el.innerHTML
});
```

如果`template`不是字符串，那就判断它是不是一个`DOM`元素，如果是，则使用该`DOM`元素的`innerHTML`作为模板，如下：

```javascript
if (template.nodeType) {
  template = template.innerHTML;
}
```

如果既不是字符串，也不是`DOM`元素，此时会抛出警告：提示用户`template`选项无效。如下：

```javascript
else {
  {
    warn('invalid template option:' + template, this);
  }
  return this
}
```

如果变量`template`不存在，表明用户没有传入`template`选项，则根据传入的`el`参数调用`getOuterHTML`函数获取外部模板，如下：

```javascript
if (el) {
  template = getOuterHTML(el);
}

function getOuterHTML (el) {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    var container = document.createElement('div');
    container.appendChild(el.cloneNode(true));
    return container.innerHTML
  }
}
```

不管是从内部的`template`选项中获取模板，还是从外部获取模板，总之就是要获取到用户传入的模板内容，有了模板内容接下来才能将模板编译成渲染函数。

获取到模板之后，接下来要做的事就是将其编译成渲染函数，如下：

```javascript
if (template) {
  var ref = compileToFunctions(template, {
    outputSourceRange: "development" !== 'production',
    shouldDecodeNewlines: shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: shouldDecodeNewlinesForHref,
    delimiters: options.delimiters,
    comments: options.comments
  }, this);
  var render = ref.render;
  var staticRenderFns = ref.staticRenderFns;
  options.render = render;
  options.staticRenderFns = staticRenderFns;
}
```

关于将模板编译成渲染函数的具体步骤在前面文章模板编译篇中已经做了详细介绍，在这里，我们仅做简单回顾。

把模板编译成渲染函数是在`compileToFunctions`函数中进行的，该函数接收待编译的模板字符串和编译选项作为参数，返回一个对象，对象里面的`render`属性即是编译好的渲染函数，最后将渲染函数设置到`$options`上。

## 3. 总结

本篇文章介绍了生命周期中的第二个阶段——模板编译阶段。

首先介绍了`Vue`源码构建的两种版本：完整版本和只包含运行时版本。并且我们知道了模板编译阶段只存在于完整版中，在只包含运行时版本中不存在该阶段，这是因为在只包含运行时版本中，当使用`vue-loader`或`vueify`时，`*.vue`文件内部的模板会在构建时预编译成渲染函数，所以是不需要编译的，从而不存在模板编译阶段。

然后对比了两种版本`$mount`方法的区别。它们的区别在于在`$mount`方法中是否进行了模板编译。在只包含运行时版本的`$mount`方法中获取到`DOM`元素后直接进入挂载阶段，而在完整版本的`$mount`方法中是先将模板进行编译，然后回过头调只包含运行时版本的`$mount`方法进入挂载阶段。

最后，我们知道了分析模板编译阶段其实就是分析完整版的`vm.$mount`方法的实现，我们将完整版的`vm.$mount`方法源码进行了逐行分析。知道了在该阶段中所做的工作就是：从用户传入的`el`选项和`template`选项中获取到用户传入的内部或外部模板，然后将获取到的模板编译成渲染函数。


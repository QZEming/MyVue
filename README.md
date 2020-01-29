# 实现步骤

在vue中，MVVM的体现就是双向数据绑定，而双向的数据绑定又是我们面试中经常被问到的问题，我们知道在vue2中，双向数据绑定是通过```Object.definePrototype```和发布订阅模式来实现的，而在vue3中，将数据监听的方式从```Object.definePrototype```转变成使用```proxy```，关于实现的方式可见我的另一篇博客[Vue双向绑定原理](https://blog.csdn.net/zemprogram/article/details/103404763)。在这里我要说的是如何自己去实现一个简单的双向绑定，如何去解析我们平时写的结构，就如下面的结构
```html
<div id="app">
    <h1>{{person.name}} --- {{person.age}}</h1>
    <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
    </ul>
    <p>{{}}</p>
    <p v-text="msg"></p>
    <input type="text" v-model="msg">
</div>

<script src="./vue.js"></script>
<script>
    let vm = new Vue({
        el: "#app",
        data: {
            person: {
                name: 'zem',
                age: 18
            },
            msg: 'text'
        }
    })
</script>
```
在引入vue源文件后，我们在浏览器中的显示就会如图
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200127205750825.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3plbXByb2dyYW0=,size_16,color_FFFFFF,t_70)
修改输入框的内容，msg的值会相应发生变化，这就是视图(view)的改变导致数据的改变

接下来我们要做的就是来实现这些功能，解析节点中的{{}}，替换其中的内容，当数据发生变化的时候改变这些内容，对v-model绑定的数据，当视图发生改变的时候对数据也进行改变

# 初始化一个Vue类
首先，我们新建一个vue.js，替换掉原来的vue.js，然后初始化一个Vue类
```javascript
class Vue{
    constructor(){

    }
}
```
在构造实例的时候，我们要传入的内容，就是上面在script标签中```new Vue()```括号内的内容，即是
```javascript
{
    el:"#app",
    data:{
        person:{
            name:"qzm",
            age:18
        },
        msg:"text"
    }
}
```
所以我们要将这些内容放到实例里面对应的属性里
```javascript
class Vue{
    constructor(options){
        // 将传入的值放到实例中对应的属性
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
    }
}
```
接下来，我们要对传入的元素进行解析，解析前首先要判断是否存在这个属性值
```javascript
class Vue{
    constructor(options){
        // 将传入的值放到实例中对应的属性
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if(this.$el){ // 判断是否有传入el属性
            // 解析入口节点元素
        }
    }
}
```

# 实现编译类
完成了Vue类的初始化，拿到了对应的入口节点元素，接下来就是对这个入口节点元素进行编译了  
我们在Vue中判断存在入口节点元素后，将其传入编译类中，因为在编译中，我们可能还需要用到传入vue实例的data属性的内容，所以将vue实例也传入编译类实例中

```javascript
class Vue{
    constructor(options){
        // 将传入的值放到实例中对应的属性
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if(this.$el){ // 判断是否有传入el属性
            // 解析入口节点元素
            new Compile(this.$el,this);
        }
    }
}
```
接下来就是实现Compile类了
```javascript
class Compile{
    constructor(el,vm){

    }
}
```
实现Compile类第一步，对传入的节点进行判断，因为el属性是可以传入字符串，也可以直接传入节点的，如果是传入字符串的话，我们要使用```document.querySelector()```来获取这个节点，如果传入的本身就是一个节点的话，我们就直接使用这个节点。这里我通过实现一个方法来，用nodeType对节点类型进行判断
## 关于nodeType常见的值
- 1：代表节点元素
- 2：代表属性
- 3：代表元素或属性中的文本内容
- 8：代表注释

完整的看[W3C中关于nodeType的介绍](https://www.w3school.com.cn/jsref/prop_node_nodetype.asp)

接下来继续写代码,实现如下
```javascript
class Compile{
    constructor(el,vm){
        this.el = this.isElement(el) ? el : document.querySelector(el);
    }
    isElement(node){ // 判断是否为一个节点对象
        return node.nodeType === 1;
    }
}
```
将this.el打印出来，可以看到完整的入口节点元素
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200127205920373.png)

拿到了入口节点元素后，接下来就是要对这个元素进行解析，将里面的{{}}的内容替换为相应的值，但是因为每次的替换都会造成整个页面的回流和重绘，如果直接遍历节点替换的话，会造成很多的回流重绘，对整个性能会有很大的损耗，为了在**理论**上减少损耗，这里将传入的节点元素转换城文档碎片

关于文档碎片的相关知识及为什么说是理论上的-->[javascript文档碎片的使用](https://blog.csdn.net/zemprogram/article/details/104092008)

这里写个方法来将获取的节点的子孙节点放入文档碎片，
```javascript
class Compile{
    constructor(el,vm){
        this.el = this.isElement(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 将获取入口节点元素的子孙节点放入到文档碎片中
        const frag = this.transformToFrag(this.el)
    }
    isElement(node){ // 判断是否为一个节点对象
        return node.nodeType === 1;
    }
    transformToFrag(node){
        // 创建文档碎片
        const frag = document.createDocumentFragment();
        // 将节点依次放入到文档碎片中
        let firstChild = node.firstChild; // 取出开头的节点
        while(firstChild){ // 判断是否还有子孙节点
            frag.appendChild(firstChild);
            firstChild = node.firstChild;
        }
        return frag;
    }
}
```
此时打开页面发现所有内容都被放入到文档碎片中了，入口节点元素已经没有子节点了  
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200127131636488.png)  
将frag文档碎片打印出来，可以看到
```javascript
const frag = this.transformToFrag(this.el)
console.log(frag)
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200127210052522.png)

放入文档碎片后，要对文档碎片中的节点进行遍历，替换相应内容，这个过程就是编译，在编译之后将编译好的子孙节点重新插入到入口节点元素中  
遍历时要判断是为文本还是为节点，如果是节点的话，要继续看该节点是否有子孙节点，对该节点使用同样的方法操作
```javascript
class Compile{
    constructor(el,vm){
        this.el = this.isElement(el) ? el : document.querySelector(el);
        this.vm = vm;
        // 将获取入口节点元素的子孙节点放入到文档碎片中
        const frag = this.transformToFrag(this.el);
        // 编译文档碎片中的子孙节点
        this.compile(frag)
        // 将编译好的文档碎片插入到入口元素节点
        this.el.appendChild(frag);
    }
    compile(frag){
        // 获取文档碎片的子元素
        const childNodes = frag.childNodes;
        // 这里的childNodes就是一个NodeList数组NodeList(9) [text, h1, text, ul, text, p, text, input, text]
        // 使用...运算符来处理childNodes将其变为一个数组
        [...childNodes].forEach(node=>{
            if(this.isElement(node)){ // 判断为元素节点
                // 对元素节点的编译操作
                this.compileElement(node);
            }else{ // 文本节点
                // 对文本节点的编译操作
                this.compileText(node);
            }
            if(node.childNodes){
                this.compile(node);
            }
        })
    }
    compileElement(node){

    }
    compileText(node){

    }
    // ...
}
```
这里写了compileElement方法和compileText方法分别用来解析元素节点和文本节点

## 对元素节点的解析
首先是对元素节点的解析，一个元素节点是否需要进行处理，就看元素中是否有v-开头的属性，如v-text，v-html，v-model，这三个值分别表示元素对应的文本内容，html内容，和表单的value值。

首先，我们获取元素所有的属性值，打印出所有的属性和值
```javascript
compileElement(node){
    const attrs = node.attributes;
    [...attrs].forEach(attr=>{ // attr是object类型
        const {name,value} = attr;
        console.log(`name:${name} --- value:${value}`)
    })
}
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200128133257916.png)
接下来要对v-开头的元素进行处理，除了v-开头之外，v-bind的简写:和v-on的简写@也要进行处理，这里写一个函数来判断一个标签是否为要处理的标签
```javascript
isVueElement(name){ // 判断一个属性是否为要处理的属性
    return name.startsWith("v-")||name.startsWith(":")||name.startsWith("@")
}
```
接下来就是要调用这个方法来判断是否为要处理的标签，对要处理的标签进行分割字符串，判断是哪种类型，然后执行相应的处理

这里先在文件根目录下创建一个对象来存储对不同指令的操作
```javascript
const compileHandle = {
    text:function(node,expr,vm){

    },
    html:function(node,expr,vm){

    },
    model:function(node,expr,vm){

    },
    if:function(node,expr,vm){

    },
    show:function(node,expr,vm){

    },
    for:function(node,expr,vm){

    },
    key:function(node,expr,vm){

    },
    bind:function(node,expr,vm,bindType){

    },
    on:function(node,expr,vm,bindType){

    }
}
```
接下来对指令进行分割，将分割后对应的内容传到上面创造的对象里面相应的方法，在调用方法后将指令删掉
```javascript
compileElement(node){
    const attrs = node.attributes;
    [...attrs].forEach(attr=>{ // attr是object类型
        let {name,value} = attr;
        if(this.isVueElement(name)){
            if(name.startsWith(":"))
                name = "v-bind"+name;
            else if(name.startsWith("@"))
                name = "v-on:"+name.slice(1);
            const [,instructions] = name.split("-"); // 将指令如text，bind:type，on:click赋值给instructions
            const [type,bindType] = instructions.split(":"); // 将text，on，bind之类的值给type，bind，on绑定的值给bindType
            compileHandle[type](node,value,this.vm,bindType);
            node.removeAttribute(name)
        }
    })
}
```

接下来实现上面对象中的对应方法  
首先是v-text，其实也就是在vue实例的data属性中找到当前处理指令的值相应名字的属性，因为传入的字符串可能是```"msg"```这种字符串，也可能是```"person.name"```这种字符串，所以不能直接使用```vm.data[expr]```来处理，这里使用reduce函数来处理，用textContent来给元素的文本赋值
```javascript
const compileHandle = {
    text:function(node,expr,vm){
        node.textContent = expr.split(".").reduce((data,attr)=>{
            return data[attr];
        },vm.$data)
    },
    // ...
}
```
同理实现v-html和v-model，这里先不实现v-model的双向绑定
```javascript
const compileHandle = {
    text:function(node,expr,vm){
        node.textContent = expr.split(".").reduce((data,attr)=>{
            return data[attr];
        },vm.$data)
    },
    html:function(node,expr,vm){
        node.innerHTML = expr.split(".").reduce((data,attr)=>{
            return data[attr];
        },vm.$data)
    },
    model:function(node,expr,vm){
        node.value = expr.split(".").reduce((data,attr)=>{
            return data[attr];
        },vm.$data)
    },
    // ...
}
```
这里三种获取值的操作都是一样的，写一个方法将其分离出来，因为后面的视图改变也可能影响数据，所以将数据的修改放到该对象的另一个属性里
```javascript
const compileHandle = {
    text(node,expr,vm){
        const val = this.getVal(expr,vm)
        this.updater.textUpdate(node,val)
    },
    html(node,expr,vm){
        const val = this.getVal(expr,vm)
        this.updater.htmlUpdate(node,val)
    },
    model(node,expr,vm){
        const val = this.getVal(expr,vm)
        this.updater.modelUpdate(node,val)
    },
    // ...
    updater:{
        textUpdate(node,value){
            node.textContent = value
        },
        htmlUpdate(node,value){
            node.innerHTML = value
        },
        modelUpdate(node,value){
            node.value = value
        }
    },
    getVal(expr,vm){
        return expr.split(".").reduce((data,attr)=>{
            return data[attr];
        },vm.$data)
    }
}
```

打开页面，发现text已经被渲染出来了
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200128142101657.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3plbXByb2dyYW0=,size_16,color_FFFFFF,t_70)
在index.html中加上下面的标签，测试是否有效
```html
<p v-text="person.name"></p>
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200128142515132.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3plbXByb2dyYW0=,size_16,color_FFFFFF,t_70)
实践有效，zem渲染出来了，接下来我们来处理一下方法，其他的指令我会在之后写到代码中，这里就不一一叙述了

先写两个按钮，测试两种绑定方法，在vue实例中添加一个方法
```html
<button v-on:click="test">v-on test</button>
<button @click="test">@ test</button>
```
```javascript
let vm = new Vue({
    el: "#app",
    data: {
        person: {
            name: 'zem',
            age: 18
        },
        msg: 'text'
    },
    methods: {
        test() {
            console.log(this);
        }
    }
})
```

回到vue.js里面的compileHandle对象来编写相应的方法
```javascript
on(node,expr,vm,bindType){
    let fn = vm.$options.methods&&vm.$options.methods[expr]; // 将函数赋值给fn
    node.addEventListener(bindType,fn.bind(vm),false); // 使用bind将this绑定到vue实例中
},
```
## 对文本节点的解析
接下来对文本节点进行解析  
对文本节点，我们只需要解析放在```{{}}```中的内容就可以了，所以首先写一个正则表达式来匹配这些内容
```javascript
compileText(node){
    const text = node.textContent;
    if(/\{\{.+?\}\}/g.test(text)){
        console.log(text);
    }
}
```
打印出来的内容
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200128150856841.png)
因为{{}}和v-text一样都是对textContent进行操作，所以我们可以使用compileHandle对象中的text方法来完成替换操作，但是，我们需要对方法进行一定的修改  
```javascript
const compileHandle = {
    text(node,expr,vm){
        let val
        if(expr.includes("{")){ // 判断是否为文本节点的修改
            val = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{ // 找到所有的{{}}，将{{}}内的内容做为一个分组来替换
                return this.getVal(args[1],vm); // 这里的args[1]就是我们要的每个{{}}内的值
            })
        }else{ 
            val = this.getVal(expr,vm)
        }
        this.updater.textUpdate(node,val)
    },
    // ...
}
```
然后调用该方法
```javascript
compileText(node){
    const text = node.textContent;
    if(/\{\{.+?\}\}/g.test(text)){
        compileHandle.text(node,text,this.vm)
    }
}
```
打开页面发现已经渲染成功了
![在这里插入图片描述](https://img-blog.csdnimg.cn/2020012815220451.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3plbXByb2dyYW0=,size_16,color_FFFFFF,t_70)

到这一步之后，文本节点的解析基本完成，数据已经可以正常渲染了，接下来我们需要对数据进行监听

# 实现监听
数据渲染虽然完成了，但是每当数据发生改变的时候，我们要监听数据的变化，将相应的变化的值渲染到页面上，在vue文件里面实现一个监听类，监听vue实例中data的数据变化，在vue实例化的时候就使用这个监听，将vue实例的data传入观察实例中
```javascript
class Observer{
    constructor(data){

    }
}
class Vue{
    constructor(options){
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if(this.$el){ // 判断el是否存在
            // 实现一个观察者
            new Observer(this.$data);
            // 实现一个指令解析器
            new Compile(this.$el,this);
        }
    }
}
```
在观察者中，我们要对data中的每个数据进行监听，如果数据是对象的话，还要进行递归遍历，这里使用object.defineProperty来实现数据监听
```javascript
class Observer{
    constructor(data,vm){
        vm.$data = this.observe(data);
    }
    observe(data){
        if(data && typeof data === "object"){
            Object.keys(data).forEach(key=>{ // 使用Object.keys获取当前一层的属性名
                this.defineReactive(data,key,data[key]); // 对data的key属性进行监听
            })
        }
        return data;
    }
    defineReactive(data,key,val){
        this.observe(val); // 递归遍历
        Object.defineProperty(data,key,{
            get:()=>{
                return val
            },
            set:(newVal)=>{
                if(newVal!==val){
                    this.observe(newVal); // 对传入的新值进行监听
                    val = newVal
                }
            }
        })
    }
}
```

# 实现观察者和依赖收集
通过上面实现observer后，我们已经可以监听数据的变化，那么接下来就是要在数据变化的时候，调用相应的函数修改视图  
初始化观察者类Watcher和依赖收集类Dep，观察者要做到能获取旧值，当传入的新值与旧值不同的时候，要触发更新方法调用相应的更新函数，而获取旧值需要有指令相应的字符串表述（就如{{}}里面的内容），所以初始化Watch要传入三个值
```javascript
class Watcher{
    constructor(vm,expr,cb){
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        this.oldVal = this.getOldVal()
    }
    update(){
        const newVal = compileHandle.getVal(this.expr,this.vm);
        if(newVal!==this.oldVal){ // 如果新值与旧值不同
            this.cb(newVal) // 调用回调函数
        }
    }
    getOldVal(){
        return compileHandle.getVal(this.expr,this.vm)
    }
}
```
对于依赖收集类，我们要在初始化的时候就创建一个列表来放置watcher，此外要有添加watcher到这个列表的方法，以及通知这个列表中的watcher触发更新，这也就是[发布订阅模式](https://blog.csdn.net/zemprogram/article/details/89856801)中的发布者
```javascript
class Dep{
    constructor(){
        this.subs = []; // 初始化依赖收集列表
    }
    addSub(watcher){ // 添加观察者
        this.subs.push(watcher);
    }
    notify(){ // 通知列表中的所有观察者触发更新
        this.subs.forEach(w=>w.update());
    }
}
```
完成观察者类和依赖收集的声明后，接下来要做的就是将Dep和Observer关联起来，一个数据要在什么时候被监听，或者说什么数据应该被监听，如果在data中有的数据一直没被用到，那我们有什么必要去更新这个数据呢？  
所以应该在监听的时候，在get方法中将watcher放到Dep的sub中，而Watcher是在我们初次对数据进行解析的时候就new的，所以也不会在Observer中new新的watcher，所以我们在Watcher初始化获取旧值的时候，先将实例本身挂载到Dep的target属性上，然后在获取旧值完后将Dep的target属性置为null  
在将watcher放到sub之后，当数据发生变化，也就是触发set操作的时候，就要触发dep的notify方法，通知各个watcher去更新视图
```javascript
class Watcher{
    // ...
    getOldVal(){
        Dep.target = this; // 挂载到Dep.target上
        const oldVal = compileHandle.getVal(this.expr,this.vm);
        Dep.target = null; // 将target.target置为null
        return oldVal
    }
}

class Observer{
    // ...
    defineReactive(data,key,val){
        this.observe(val); // 递归遍历
        const dep = new Dep();
        Object.defineProperty(data,key,{
            get:()=>{
                // 判断Dep.target是否有值
                // 若有，将挂载在Dep上的watcher添加到dep的依赖列表中
                Dep.target && dep.addSub(Dep.target); 
                return val
            },
            set:(newVal)=>{
                if(newVal!==val){
                    this.observe(newVal); // 对传入的新值进行监听
                    val = newVal
                }
                dep.notify(); // 通知dep的依赖列表中的watcher触发更新
            }
        })
    }
}
```
将Observer和Watcher关联起来后，接下来就是要在解析的时候创建watcher了，watcher对应的回调函数就是updater对应的方法  
以html为例，我们只要加上一个new Watcher就可以了
```javascript
new Watcher(vm,expr,(newVal=>{
    this.updater.htmlUpdate(node,newVal)
}))
```
但是文本内容有所不同，我们可能在处理的时候遇到{{person.name}}---{{person.age}}这样的情况，而其中的person.name或者person.age的改变都会使得整个发生改变，变为其中一个的值
比如我们这样写
```javascript
const compileHandle = {
    text(node,expr,vm){
        let val
        if(expr.includes("{")){ // 判断是否为文本节点的修改
            val = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{ // 找到所有的{{}}，将{{}}内的内容做为一个分组来替换
                new Watcher(vm,args[1],(newVal=>{
                    this.updater.textUpdate(node,newVal) // 错误写法
                }))
                return this.getVal(args[1],vm); // 这里的args[1]就是我们要的每个{{}}内的值
            })
        }else{ 
            val = this.getVal(expr,vm)
            new Watcher(vm,expr,(newVal=>{
                this.updater.textUpdate(node,newVal)
            }))
        }
        this.updater.textUpdate(node,val)
    },
    // ...
}
```
在控制台写上
```javascript
vm.$data.person.name = "1"
```
发现  
![在这里插入图片描述](https://img-blog.csdnimg.cn/202001291821247.png)  
变成了  
![在这里插入图片描述](https://img-blog.csdnimg.cn/20200129182149676.png)  
这显然不是我们要的结果，所以要再写一个方法来找到文本内容中的每个{{}}内的内容，对每个内容的值返回相应的值  
修改后的compileHandle对象如下
```javascript
const compileHandle = {
    text(node,expr,vm){
        let val
        if(expr.includes("{")){ // 判断是否为文本节点的修改
            val = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{ // 找到所有的{{}}，将{{}}内的内容做为一个分组来替换
                new Watcher(vm,args[1],(newVal=>{
                    this.updater.textUpdate(node,this.getContentVal(expr,vm))
                }))
                return this.getVal(args[1],vm); // 这里的args[1]就是我们要的每个{{}}内的值
            })
        }else{ 
            val = this.getVal(expr,vm)
            new Watcher(vm,expr,(newVal=>{
                this.updater.textUpdate(node,newVal)
            }))
        }
        this.updater.textUpdate(node,val)
    },
    html(node,expr,vm){
        const val = this.getVal(expr,vm)
        new Watcher(vm,expr,(newVal=>{
            this.updater.htmlUpdate(node,newVal)
        }))
        this.updater.htmlUpdate(node,val)
    },
    model(node,expr,vm){
        const val = this.getVal(expr,vm)
        new Watcher(vm,expr,(newVal=>{
            this.updater.modelUpdate(node,newVal)
        }))
        this.updater.modelUpdate(node,val)
    }
    getContentVal(expr,vm){
        return expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{ // 找到所有的{{}}，将{{}}内的内容做为一个分组来替换
            return this.getVal(args[1],vm); // 这里的args[1]就是我们要的每个{{}}内的值
        })
    },
    // ...
}
```

到这里，我们完成了监听数据变化修改视图，接下里就是要做视图的变化来影响数据了
# 实现视图驱动数据
实际上会通过视图驱动数据的，也就是v-model，所以我们直接修改compileHandle对象中的model方法，在创建watcher后，给有v-model属性的元素绑定input方法，将表单元素的新值赋给vm.$data中相应的属性，写一个setVal方法来设置值
```javascript
const compileHandle = {
    model(node,expr,vm){
        const val = this.getVal(expr,vm)
        new Watcher(vm,expr,(newVal=>{
            this.updater.modelUpdate(node,newVal)
        }))
        node.addEventListener("input",e=>{ // 监听表单元素
            this.setVal(expr,vm,e.target.value) // 设置新值
        })
        this.updater.modelUpdate(node,val)
    },
    setVal(expr,vm,newVal){
        expr.split(".").reduce((data,attr)=>{
            data[attr] = newVal;
        },vm.$data)
    },
    // ...
}
```

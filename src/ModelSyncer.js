/*
*/
(function() {
    
    let root = {};
    let listeners = {};
    let behaviors = {};

    function getSubmodel(root, parts) {
        let point = root;
        for(let i = 0; i < parts.length - 1; i++) {
            let pathPart = parts[i];
            if (!point.hasOwnProperty(pathPart)) {
                point[pathPart] = {};
            }
            point = point[pathPart];
        }
        return point;
    }

    function getExpression(element, attributeName) {
        return element.getAttribute(attributeName).replace(/\$this/g, "element").replace(/\$value/g, "value").replace(/\$model/g, "root");
    }

    function applySyncDeep(element, value) {
        applySync(element, value);
        for(let i = 0; i < element.children.length; i++) {
            applySyncDeep(element.children[i], value);
        }
    }

    function applySync(element, value) {
        if (element.hasAttribute("sync:text")) {
            element.innerHTML = eval(getExpression(element, "sync:text"));
        }
        if (element.hasAttribute("sync:href")) {
            element.href = eval(getExpression(element, "sync:href"));
        }
        if (element.hasAttribute("sync:title")) {
            element.title = eval(getExpression(element, "sync:title"));
        }
        if (element.hasAttribute("sync:src")) {
            element.src = eval(getExpression(element, "sync:src"));
        }
        if (element.hasAttribute("sync:disabled")) {
            element.disabled = eval(getExpression(element, "sync:disabled"));
        }
        if (element.hasAttribute("sync:style")) {
            element.style = eval(getExpression(element, "sync:style"));
        }
        if (element.hasAttribute("sync:value")) {
            element.value = eval(getExpression(element, "sync:value"));
        }
        if (element.hasAttribute("sync:checked")) {
            element.checked = eval(getExpression(element, "sync:checked"));
        }
        if (element.hasAttribute("sync:selected")) {
            element.selected = eval(getExpression(element, "sync:selected"));
        }
        if (element.hasAttribute("sync:className")) {
            element.className = eval(getExpression(element, "sync:className"));
        }
        if (element.hasAttribute("sync:scrollTop")) {
            element.scrollTop = eval(getExpression(element, "sync:scrollTop"));
        }
        if (element.hasAttribute("sync:placeholder")) {
            element.placeholder = eval(getExpression(element, "sync:placeholder"));
        }
        if (element.hasAttribute("syncstyle:display")) {
            element.style.display = eval(getExpression(element, "syncstyle:display"));
        }
        if (element.hasAttribute("syncstyle:visibility")) {
            element.style.visibility = eval(getExpression(element, "syncstyle:visibility"));
        }
        if (element.hasAttribute("syncstyle:toggleClass") && element.hasAttribute("syncstyle:className")) {
            let className = element.getAttribute("syncstyle:className");
            if (eval(getExpression(element, "syncstyle:toggleclass")) === true) {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }
        }
        if (element.hasAttribute("sync:children")) {
            // Remove all elements except the template
            let template = element.firstElementChild;
            while (template.nextSibling) {
                element.removeChild(template.nextSibling);
            }

            for (let i = 0; i < value.length; i++) {
                let child = template.cloneNode(true);
                child.style.display = '';
                applySyncDeep(child, value[i]);
                element.appendChild(child);
            }

            if (element.hasAttribute("sync:behaviors")) {
                let syncBehaviors = element.getAttribute("sync:behaviors");
                let behaviorNames = syncBehaviors.split(",");
                for (let i =0; i < behaviorNames.length; i++) {
                    behaviors[behaviorNames[i]](element);
                }
            }
        }

    }

    function createListener(element) {
        return function(value){
            applySync(element, value);
        };
    }

    let updateModel = function(path, component, expression) {
        doSet(path, function(previousValue) {
            expression = expression.replace(/\$this/g, "component");
            expression = expression.replace(/\$value/g, "previousValue");
            expression = expression.replace(/\$model/g, "root");
            return eval(expression);
        }, false);
    };
    let all = document.querySelectorAll("[sync\\:path]");
    let initializing = [];
    for (let i = 0; i < all.length; i++) {
        let target = all[i];
        let path = target.getAttribute("sync:path");
        let callback = createListener(target);
        listen(path, callback);

        if (target.hasAttribute("sync:output")) {
            let eventName = target.getAttribute("sync:on");
            target.addEventListener(eventName, function() {
                updateModel(path, target, target.getAttribute("sync:output"));
            });
            initializing.push(target);
        } else if (target.hasAttribute("sync:init")) {
            initializing.push(target);
        }
    }
    for (let i = 0; i < initializing.length; i++) {
        let target = initializing[i];
        let path = target.getAttribute("sync:path");
        let initExpression = target.hasAttribute("sync:init")? target.getAttribute("sync:init") : target.getAttribute("sync:output");
        updateModel(path, target, initExpression);
    }

    function touch(path) {
        let value = get(path);
        if (value == null) {
            value = 0;
        }
        set(path, value + 1);
    }

    function update(path, value) {
        doSet(path, function(currentValue) { 
            let expression = value.replace(/\$value/g, currentValue);
            return eval(expression);
        });
    }

    function merge(path, value) {
        doSet(path, function(currentValue) { return value; }, true);
    }

    function set(path, value) {
        doSet(path, function(currentValue) { return value; }, false);
    }

    function mergeOnFirst(o1, o2) {
        for(attribute in o2) {
            if (o2[attribute].constructor == Object && o1.hasOwnProperty(attribute) && o1[attribute].constructor == Object) {
                mergeOnFirst(o1[attribute], o2[attribute]);
            } else {
                o1[attribute] = o2[attribute];
            }
        }
    }
    function doSet(path, valueGetter, merge) {
        let parts = path.split(".");
        let parent = getSubmodel(root, parts);
        let propertyName = parts[parts.length - 1];
        let previousValue = parent[propertyName];
        let newValue = valueGetter(previousValue);
        if (typeof previousValue == "undefined" || newValue != previousValue) {
            if (merge) {
                mergeOnFirst(parent[propertyName], newValue);
            } else {
                parent[propertyName] = newValue;
            }
            let callbacks = listeners[path];
            if (callbacks) {
                // Notify children of this property, already registered as listeners
                for(let j = 0; j < callbacks.length; j++) {
                    let value = parent[propertyName];
                    let relativePath = callbacks[j].relativePath;
                    if (relativePath != null) {
                        let parts = relativePath.split(".");
                        for(k = 0; k < parts.length; k++) {
                            value = value != null && value != undefined? value[parts[k]]:undefined;
                        }
                    }
                    callbacks[j].callback(value);
                }
                notifyParents(parts);
            }
        }
        console.log(path + ": " + previousValue + "->" + newValue);
    }

    function notifyParents(parts) {
        let value = root;
        let path = "";
        let separator = "";
        for (let i = 0; i < parts.length - 1; i++) {
            value = value[parts[i]];
            path = path + separator + parts[i];
            separator = ".";
            let callbacks = listeners[path];
            for(let i = 0; i < callbacks.length; i++) {
                if (callbacks[i].relativePath == null) {
                    callbacks[i].callback(value);
                }
            }
        }
    }

    function get(path, value) {
        let parts = path.split(".");
        let parent = getSubmodel(root, parts);
        let propertyName = parts[parts.length - 1];
        return parent[propertyName];
    }

    function listen(path, callback) {
        let parts = path.split(".");
        let incrementalPath = "";
        let separator = "";
        for(let i = 0; i < parts.length; i++) {
            incrementalPath += separator + parts[i];
            separator = ".";
            if (incrementalPath != path) {
                relativePath = path.substring(incrementalPath.length + 1);
            } else {
                relativePath = null;
            }
            addListener(incrementalPath, relativePath, callback);
        }
    }

    function addListener(path, callbackRelativePath, callback) {
        if (!listeners.hasOwnProperty(path)) {
            listeners[path] = [];
        }
        let callbacks = listeners[path];
        callbacks.push({
            relativePath: callbackRelativePath,
            callback: callback
        });
    }
    
    function removeListener(path, callback) {
        let parts = path.split(".");
        let incrementalPath = "";
        let separator = "";
        for(let i = 0; i < parts.length; i++) {
            incrementalPath += separator + parts[i];
            separator = ".";
            let callbacks = listeners[incrementalPath]
            let index = callbacks.findIndex(function(testCallback){
                return testCallback.callback == callback;
            });
            if (index != -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    function registerBehavior(name, behavior) {
        behaviors[name] = behavior;
    }

    di["syncer"] = {
        merge:merge,
        set:set,
        update:update,
        touch:touch,
        get:get,
        listen:listen,
        removeListener:removeListener,
        registerBehavior:registerBehavior
    }
})();

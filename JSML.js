
/**
 * @require Array.isArray()
 *
 * @version 1.0
 * @author tkurowski
 *
 * @class JSML (JS Markup Language) lets you build a ML structure in JS.
 *
 * var HTMLBuilder = new JSML("head", "body", "article", "br/", "img/", ...);
 * // You can add tags to existing JSML object:
 * HTMLBuilder.tags("quote", "pre", "p";)
 * // note: use tag/ notation for self-closing tags
 *
 * // Use objects "{}" to pass attributes;
 * // other arguments are interpreted as children
 *
 * with (HTMLBuilder) {
 * tmpl = body(
 *          header("Header's content"),
 *          article({id: "main", class="news"},
 *              section(
 *                  h2("Section title"),
 *                  p("1st paragraph"),
 *                  p("2nd one...", {class="important"}))));
 * }
 * tmpl.build.html();    // "<body><header>..."
 * tmpl.build.dom();     // [object HTMLBodyElement]
 *
 * // Calling an abject adds children or attributes
 * img({src: "http://..."})({alt: "my image"})({"width": 10});
 * evaluates to the same as:
 * img({src: "http://...", alt: "my image", "width": 10});
 *
 * // You can also pass arrays (following are equivalent):
 * ul([li, li, li]);
 * ul(li)(li)(li);
 * ul(li, li, li);
 */


var JSML = (function () {

    function ElementBuilder(tag, selfClosing) {
        if (tag) this._tag = tag;
        if (selfClosing) this._isSelfClosing = true;
    }


    ElementBuilder.prototype = {
        constructor: ElementBuilder,

        _tag: null,
        _children: null,
        _isSelfClosing: false,

        html: function () {
            return this._closeTag(this._innerHTML(this._openTag())).join("");
        },

        dom: function () {
            return this._domChildren(this._domElement());
        },

        callableElement: function () {
            var ce = function () {
                var self = arguments.callee,
                    build = self.build;
                Array.prototype.forEach.call(arguments, build.parse, build);
                return self;
            };
            ce.build = this;
            return ce;
        },

        parse: function (item) {
            if (item === null || item === undefined) {
                throw new SyntaxError("Bad argument: " + item);
            }

            if (Array.isArray(item)) {
                item.forEach(arguments.callee, this)
            }
            /** must be uncommented if typeof callableElement === "object"
            else if (this.__isCallableElement(item)) {
                if (! this._children) this._children = [];
                this._children.push(item);
            }
            */
            else if (typeof item === "object") {
                // parse args
                if (! this._attrs) this._attrs = {};
                for (var attrname in item) {
                    this._attrs[attrname] = item[attrname];
                }
            }
            else {
                if (! this._children) this._children = [];
                this._children.push(item);
            }
        },

        __isCallableElement: function (ce) {
            return typeof ce === "function"
                && ce.build instanceof ElementBuilder;
        },

        // --- HTML

        _openTag: function () {
            var arr = ["<", this._tag];

            if (this._attrs) {
                for (var attrname in this._attrs) {
                    arr.push(" "+attrname);
                    if (this._attrs[attrname] !== null) {
                        arr.push('="' + this._attrs[attrname] + '"');
                    }
                }
            }

            arr.push(this._isSelfClosing ? "/>" : ">");
            return arr;
        },

        _innerHTML: function (arr) {
            if (! this._isSelfClosing && this._children) {
                this._children.forEach(function (ch) {
                    if (this.__isCallableElement(ch)) {
                        arr.push(ch.build.html());
                    }
                    else arr.push(ch);
                }, this);
            }
            return arr;
        },

        _closeTag: function (arr) {
            if (! this._isSelfClosing) {
                arr.push("</" + this._tag + ">");
            }
            return arr;
        },

        // --- DOM

        _domElement: function () {
            var el = document.createElement(this._tag);
            if (this._attrs) {
                for (var attrname in this._attrs) {
                    el.setAttribute(attrname, this._attrs[attrname]);
                }
            }
            return el;
        },

        _domChildren: function (el) {
            if (! this._isSelfClosing && this._children) {
                this._children.forEach(function (ch) {
                    if (this.__isCallableElement(ch)) {
                        el.appendChild(ch.build.dom());
                    }
                    else {
                        el.appendChild(document.createTextNode(ch));
                    }
                }, this);
            }
            return el;
        },

        toString: function () {
            return "[object ElementBuilder: " + this._tag + "]";
        }
    };


    function FragmentBuilder() {}

    FragmentBuilder.prototype = new ElementBuilder();
    ; (function () {
        constructor: FragmentBuilder,

        this.html = function () {
            return this._innerHTML([]).join("");
        };

        this._domElement = function () {
            return document.createDocumentFragment();
        };

        this.toString = function () {return "[object FragmentBuilder]";};

    }).call(FragmentBuilder.prototype);


    function JSML() {
        this.tags.apply(this, arguments);
    };

    JSML.prototype = {
        constructor: JSML,

        get frag() {return new FragmentBuilder().callableElement();},

        tags: function (/* ... */) {
            Array.prototype.forEach.call(arguments, function (tag) {
                var args = this._parseTag(tag);
                this.__defineGetter__(args[0], function () {
                    return new ElementBuilder(
                        args[0], args[1]).callableElement();
                });
            }, this);

            // chain...
            return this;
        },

        create: function (tag) {
            var args = this._parseTag(tag);
            return new ElementBuilder(args[0], args[1]).callableElement();
        },

        _parseTag: function (tag) {
            return (tag.substr(-1) === "/") ?
                [tag.substr(0, tag.length-1), true] : [tag, false];
        },

        toString: function () {return "[object JSML]";}
    };

    return JSML;

})();

;(function ($) {

    window.xTree = function (opt) {
        return new tree(opt);
    };

    var defOpt = {
        dom: '',  //jqueryDom
        is_trigger: false,  //是否需要触发? 否则直接显示
        has_search: false,
        only_child: true,//是否结果只要 child
        node_merge: true,//结果只显示最上层  比如   中国被选中  四川,成都则不会显示  否则 每个被勾选的节点都显示
        zIndex: 1,
        choose: false,  //哪些是选中的？优先级高于data  {nodeId:[1,2,3],id:[1,2,3]}
        // node_first:false,//是否需要节点排在前面  否则按照data的顺序
        is_multi: true,//是否多选
        expand: false, //是否展开，false、true、num  //todo expand
        width: null,
        maxHeight: null,
        data: [],//{id:1,name:'xx',nodeId:'0',is_node:true,is_check:false},
        sel_ids: '',
        onInit: function () {
        },
        onOpen: function () {
        }, //触发时
        onBeforeOpen: function () {
        },
        onClose: function (has_chg) {
            //has_chg  是否发生变化
        },
        onCheck: function (item, dom, childrenItem) {
            //item 点击的item
            //dom 点击的dom
            //childrenItem  所有影响的子节点
        },
        onCancel: function (item, dom, childrenItem) {
        },
        onChange: function (item, dom, childrenItem) {
        }
    };


    var tree = function (opt) {
        this._init(opt);
        return this;
        /**
         * return {
         *     'start':this.start,
         *     'end':this.end
         * };  //todo  这样会导致 this 没有 别的方法 到底 还是不能正常使用
         */


    };


    /**
     *
     * @var opt  用户传进来的option
     * @var dom 打开tree的载体jquery dom
     * @var data  做tree的data
     * @var html tree的html
     */


    tree.prototype = {
        _is_open: false,  //是否open
        _originId: {nodeId: [], id: []},   //上次打开时候选中了哪一些id
        _searchTimer: '',   //搜索框的定时器
        _is_first: true,  //是不是第一次打开
        _init: function (opt) {
            this.opt = $.extend(true, {}, defOpt, opt);
            this.dom = this.opt.dom;
            this.dom.css({'position':'relative'});
            this.data = this.opt.sel_ids ? _selData(this.opt.data, this.opt.sel_ids) : this.opt.data;
            this.html = this._makePanel();
            this.rootId = 1314;

            var res = checkData(this.data);
            if (!res) {
                return false;
            }

            this.opt.onInit();

            var that = this;

            this.rootId = _getRootId(that.data);

            this._originId = this.getId();


            if (this.opt.is_trigger) {
                this.dom.off('click.xTree');
                this.dom.on('click.xTree', function (e) {
                    $('.xTreePanel').hide();
                    that.start();
                    e.stopPropagation();
                });
                $(document).on('click.xTree', function () {
                    that.end();
                });
            } else {
                this.start();
            }
        },

        /**
         *      方法
         *
         */
        start: function () {
            this.opt.onBeforeOpen();
            this._showPanel();
            this._showData();
            this._expand();
            this._is_open = true;

            this.html.find('.x-tree-search').focus();
            this.opt.onOpen();
            return this;
        },
        end: function () {
            if (this._is_open) {
                this.html.hide();
                var ids = this.getId();

                this._is_open = false;
                this.opt.onClose(JSON.stringify(ids) !== JSON.stringify(this._originId));
                this._originId = ids;
            }
        },


        getName: function () {
            var text = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        text.push(n.name);
                    }
                });
            } else {
                if (this.opt.node_merge) {
                    var nodes = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            nodes.push(n.id);
                        }
                    });

                    var clone = $.extend(true, [], data); //直接赋值传的是引用
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, nodes) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });

                    $.each(clone, function (i, n) {
                        if (n) {
                            text.push(n.name);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            text.push(n.name);
                        }
                    });
                }
            }

            return text.join();
        },
        getId: function () {
            var id = [];
            var nodeId = [];
            var data = this.data;

            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        id.push(n.id);
                    }
                });

            } else {

                if (this.opt.node_merge) {
                    var node = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone = $.extend(true, [], data);
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, node) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });


                    $.each(clone, function (i, n) {
                        if (n) {
                            if (n.is_node) {
                                nodeId.push(n.id);
                            } else {
                                id.push(n.id);
                            }
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            if (n.is_node) {
                                nodeId.push(n.id);
                            } else {
                                id.push(n.id);
                            }
                        }
                    });
                }


                id = {'id': id, 'nodeId': nodeId};
            }
            return id;
        },
        cancelItem: function (id, type) {
            var item = {};
            var dom = this.html.find('input[data-isNode="' + parseInt(type) + '"][data-id="' + id + '"]').prop('checked', false);
            $.each(this.data, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = false;
                }
            });

            this._chgItem(item, dom);

        },
        cancelAll: function () {
            $.each(this.data, function (index, item) {
                item.is_check = false;
            });
            this.html.find('input').prop("checked", false);
            this.opt.onCancel();
        },
        checkItem: function (id, type) {
            var item = {};
            var dom = this.html.find('input[data-isNode="' + parseInt(type) + '"][data-i="' + id + '"]').prop('checked', true);
            $.each(this.data, function (i, n) {
                if (n.id == id && n.is_node == type) {
                    item = n;
                    item.is_check = true;
                }
            });

            this._chgItem(item, dom);

        },
        checkAll: function () {
            if (this.opt.is_multi) {
                $.each(this.data, function (index, item) {
                    item.is_check = true;
                });
                this.html.find('input').prop("checked", true);
                this.opt.onCheck();
            }
        },
        getItem: function () {
            var arr = [];
            var data = this.data;
            if (this.opt.only_child) {
                $.each(data, function (i, n) {
                    if (n.is_check && !n.is_node) {
                        arr.push(n);
                    }
                });
            } else {

                if (this.opt.node_merge) {
                    var node = [];
                    $.each(data, function (i, n) {
                        if (n.is_check && n.is_node) {
                            node.push(n.id);
//                            text.push( n.name);  //nodefirst
                        }
                    });

                    var clone = $.extend(true, [], data);
                    $.each(clone, function (i, n) {
                        if ((n.is_check && $.inArray(n.nodeId, node) != -1) || !n.is_check) {
                            clone[i] = null;
                        }
                    });


                    $.each(clone, function (i, n) {
                        if (n) {
                            arr.push(n);
                        }
                    });
                } else {
                    $.each(data, function (i, n) {
                        if (n.is_check) {
                            arr.push(n);
                        }
                    });
                }


            }
            return arr;
        },
        search: function (val) {
            this._removeLayer(this.rootId);

            if (val === '') {
                this.html.find('div[node-id="' + this.rootId + '"]').remove();
                this._showLayer(this.rootId);
            } else {
                for (var i in this.data) {
                    if (!this.data[i].is_node && this.data[i].name.indexOf(val) != -1) {
                        this.html.find('div[node-id="' + this.rootId + '"]').append(this._makeItem(this.data[i]));
                    }
                }
            }
        },


        /**
         *      视图方法
         */

        _showPanel: function () {
            if (this.opt.is_trigger) {
                this.html.css({
                    top: this.dom.outerHeight(),
                    left: 0,
                    minWidth: this.opt.width ? this.opt.width : this.dom.outerWidth()
                });

                this.html.addClass('xTreePanel');

                this.html.on('click', function (e) {
                    e.stopPropagation();
                });
            }
            this.dom.append(this.html);

        },
        _showData: function () {
            if (this._is_first) {
                this._showLayer(this.rootId);
                this._is_first = false;
            } else {
                this.html.show();
            }
        },
        _expand: function () {
            var obj = this;
            if (obj.opt.expand === true) {
                $.each(obj.data, function (index, item) {
                    if (item.is_node) {
                        obj.html.find('i').filter('.icon-jia1').click();
                    }
                });
            } else if (obj.opt.expand) {
                var expandId = [];
                expandId.push(obj.rootId);
                for (var i = 0; i < obj.opt.expand; i++) {
                    expandId = obj._expandLevel(expandId);
                }
            }
        },
        _expandLevel: function (id) {
            var obj = this;
            var expandId = [];
            $.each(id, function (index, item) {
                $.each(obj.data, function (index2, item2) {
                    if (item2.nodeId === item) {
                        expandId.push(item2.id);
                        obj.html.find('div[node-id="' + item2.nodeId + '"] > i').filter('.icon-jia1').click();
                    }
                });
            });
            return expandId;
        },
        _showLayer: function (layerId) {
            var showData = this._getLayerData(layerId);
            var itemDiv = makeLayer();


            //这里 0节点的结构 和 子节点的结构 没有处理好    以后尽量让node-id 和  itemdiv 分开
            if (layerId === this.rootId) {
                itemDiv = $(itemDiv).attr('node-id', this.rootId);
                this.html.append(itemDiv);
                //itemDiv.parent().attr('node-id',0);

            } else {
                toShrink(this.html.find('div[node-id="' + layerId + '"] i'));
                this.html.find('div[node-id="' + layerId + '"]').append(itemDiv);
            }

            for (var i in showData) {
                itemDiv.append(this._makeItem(showData[i]));
            }
        },
        _removeLayer: function (layerId) {
            this.html.find('div[node-id="' + layerId + '"]>div').remove();
            toExpand(this.html.find('div[node-id="' + layerId + '"] i'));
        },


        /**
         *      数据方法
         */
        _getLayerData: function (parent) {
            var res = [];
            for (var i in this.data) {
                if (this.data[i].nodeId == parent) {
//                if(data[i].is_node){
//                    res.unshift(data[i])
//                }else{
//                    res.push(data[i]);
//                }

                    res.push(this.data[i]);  //原序
                }
            }
            return res;
        },

        _chgItem: function (item, dom) {

            if (this.opt.is_multi) {
                if (item.is_node) {
                    dom.parent().parent().find('label > input').prop('checked', item.is_check);
                    this._chgAllChildren(item.id, item.is_check);
                }

                if (!item.is_check) {
                    this._cancelParentNode(item.nodeId);
                } else {
                    this._checkParentNode(item.nodeId);
                }
            } else {
//                    this.html.find('input').prop("checked",false);
//                    $(this).prop('checked',true);
            }


            var childItem = [];
            this._getChild(item, childItem);


            if (!item.is_check) {
                this.opt.onCancel(item, dom, childItem);
            } else {
                this.opt.onCheck(item, dom, childItem);
            }
            this.opt.onChange();


        },
        _getChild: function (node, cont) {
            if (node.is_node) {
                var that = this;
                $.each(that.data, function (i, n) {
                    if (n.nodeId == node.id) {
                        cont.push(n);
                        if (n.is_node) {
                            that._getChild(n, cont);
                        }
                    }
                })
            }

        },
        _cancelParentNode: function (id) {
            var obj = this;
            $.each(obj.data, function (i, n) {
                if (n.id == id && n.is_node && n.is_check) {
                    n.is_check = false;
                    obj.html.find('input[data-isNode="1"][data-id="' + id + '"]').prop('checked', false);
                    obj._cancelParentNode(n.nodeId);
                }
            })
        },
        _checkParentNode: function (id) {
            var obj = this;
            var allChildrenChecked = true;
            $.each(obj.data, function (i, n) {
                if (n.nodeId == id && !n.is_check) {
                    allChildrenChecked = false;
                }
            });
            $.each(obj.data, function (i, n) {
                if (n.id == id && n.is_node && !n.is_check && allChildrenChecked) {
                    n.is_check = true;
                    obj.html.find('input[data-isNode="1"][data-id="' + id + '"]').prop('checked', true);
                    obj._checkParentNode(n.nodeId);
                }
            });
        },
        _chgAllChildren: function (nodeid, bol) {
            var obj = this;
            $.each($.extend(true, [], this.data), function (i, n) {   //这句话 看起来 好像 不用 extend
                if (n.nodeId == nodeid) {
                    obj.data[i].is_check = bol;
                    if (n.is_node) {
                        obj._chgAllChildren(n.id, bol);
                    }
                }
            });
        },


        /**
         * 构造html内部方法
         */



        _makePanel: function () {
            var html = '<div></div>';

            if (this.opt.has_search) {
                html = this._makeSearch(html);
            }

            var css;
            if (this.opt.is_trigger) {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'z-index': this.opt.zIndex,
                    border: '1px solid #5d5d5d',
                    'background': '#fff',
                    position: 'absolute',
                    maxHeight: this.opt.maxHeight,
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            } else {
                css = {
                    'font-family': 'Microsoft YaHei',
                    'background': '#fff',
                    maxHeight: this.opt.maxHeight,
                    'white-space': 'nowrap',
                    'overflow': 'auto'
                };
            }


            return $(html).css(css);
        },
        _makeSearch: function (html) {
            var search = '<input class="x-tree-search" type="text" placeholder="搜索"/></div>';
            search = $(search).css({
                'border': 'none',
                'padding': '4px 0',
                'margin': '5px auto 0 auto',
                'display': 'block'
            });

            var obj = this;
            $(search).on('keyup paste', function () {
                var dom = this;
                clearTimeout(obj._searchTimer);
                obj._searchTimer = setTimeout(function () {
                    obj.search(dom.value);
                }, 100);
            });

            return $(html).append(search);

        },
        _makeNode: function (item) {
            var $html;
            if (this.opt.is_multi) {
                $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="checkbox" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
            }
            else {
                if (this.opt.only_child) {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<span>' + item.name + '</span></div>');
                }
                else {
                    $html = $('<div node-id="' + item.id + '">' + makeExpand() + '<label><input type="radio" name="' + this.dom.selector + '" data-isNode="1" data-id="' + item.id + '" ' + (item.is_check ? 'checked' : '') + ' data-name="' + item.name + '"/><span>' + item.name + '</span></label></div>');
                }
            }
            $html.find('span').css({
                'cursor': 'pointer',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none'
            });
            $html.find('input').css({
                'vertical-align': 'middle'
            });
            var obj = this;
            $html.find('i').on('click', function (e) {
                if ($(this).hasClass('icon-jia1')) {
                    obj._showLayer(item.id);
                } else {
                    obj._removeLayer(item.id);
                }
            });
            return $html;
        },
        _makeChild: function (item) {
            var $html;
            if (this.opt.is_multi) {
                $html = $('<div><span></span><label><input type="checkbox" data-id="' + item.id + '" data-isNode="0" data-name="' + item.name + '" ' + (item.is_check ? 'checked' : '') + '/>' + item.name + '</label></div>');
            }
            else {
                $html = $('<div>' + (this.opt.only_child ? '' : '<span></span>') + '<label><input type="radio" name="' + this.dom.selector + '" data-id="' + item.id + '" data-isNode="0" data-name="' + item.name + '" />' + item.name + '</label></div>');
            }
            $html.find('span').css({
                'width': '16px',
                'user-select': 'none',
                '-webkit-user-select': 'none',
                '-moz-user-select': 'none',
                '-ms-user-select': 'none',
                'display': 'inline-block'
            });
            $html.find('input').css({
                'vertical-align': 'middle'
            });
            return $html;
        },
        _makeItem: function (item) {
            var $html;
            if (item.is_node) {
                $html = this._makeNode(item);
            } else {
                $html = this._makeChild(item);
            }

            var obj = this;
            $html.find('input').on('click', function () {
                if (obj.opt.is_multi) {
                    item.is_check = !item.is_check;
                } else {
                    $.each(obj.data, function (index, item) {
                        item.is_check = false;
                    });
                    item.is_check = true;
                }


                obj._chgItem(item, $(this));

            });

            return $html;
        }


    };


    function makeLayer() {
        var html = '<div></div>';

        return $(html).css({
            'margin-left': '13px'
        });
    }

    function makeExpand() {
        // var html='<span data-icon="expand">＋</span>';
        var html = '<i class="iconfont icon-jia1"></i>';

        return $(html).css({
            'font-size': '12px',
            'vertical-align': 'base-line',
            'padding-right': '0px',
            'cursor': 'pointer'
        })[0].outerHTML;
    }

    function toShrink(dom) {
        dom.removeClass('icon-jia1');
        dom.addClass('icon-jian1');
    }

    function toExpand(dom) {
        dom.removeClass('icon-jian1');
        dom.addClass('icon-jia1');
    }


    function checkData(data) {
        for (var i in data) {
            return typeof data[i] == 'object';
        }
        return false;
    }

    function _selData(data, selected_ids){
        var sel_ids = selected_ids.split(',');
        $.each(sel_ids, function (i,id) {
            $.each(data, function (i2, item) {
                if(item.id === parseInt(id)){
                    item.is_check = true;
                    _selParent(item.nodeId);
                    if(item.is_node){
                        _selChildren(item.id);
                    }
                }
            });
        });

        function _selParent(nid) {
            if(!nid){
                return false;
            }
            var selParent = true;
            var sel_p = {};
            $.each(data, function (index, item) {
                if(item.id == nid){
                    sel_p = item;
                }
                if(item.nodeId == nid && !item.is_check){
                    selParent = false;
                    return false;
                }
            });

            if(selParent){
                sel_p.is_check = true;
                if(sel_p.nodeId){
                    _selParent(sel_p.nodeId);
                }
            }
        }

        function _selChildren(id) {
            if(!id){
                return false;
            }
            $.each(data, function (i, item) {
                if(item.nodeId === id){
                    item.is_check = true;
                    if(item.is_node){
                        _selChildren(item.id);
                    }
                }
            });
        }
        return data;
    }


    function _getRootId(_data) {
        var rootId = [];
        var clone = $.extend(true, [], _data);
        for (var i = 0, len = _data.length; i < len; i++) {
            for (var j = i; j < len; j++) {
                if (_data[i].id === _data[j].nodeId) {
                    // _data[i].is_node = true;
                    clone[j] = null;
                }
                if (_data[i].nodeId === _data[j].id) {
                    // _data[j].is_node = true;
                    clone[i] = null;
                }
            }
        }
        $.each(clone, function (i, t) {
            if (t) {
                rootId.push(t.nodeId);
            }
        });

        // //去除数组重复值
        // function unique(array){
        //     var n = [];
        //     for(var i = 0; i < array.length; i++){
        //         if (n.indexOf(array[i]) == -1) n.push(array[i]);
        //     }
        //     return n;
        // }
        //
        // function unique(array){
        //     var r = [];
        //     for(var i = 0, l = array.length; i < l; i++) {
        //         for(var j = i + 1; j < l; j++){
        //             if (array[i] === array[j]) {
        //                 j = ++i;
        //             }
        //         }
        //         r.push(array[i]);
        //     }
        //     return r;
        // }
        // rootId = unique(rootId);

        return rootId[0];
    }


})($);





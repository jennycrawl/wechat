'use strict';

module.exports = {

  summary: 'the default rule for AnyProxy',

  /**
   *
   *
   * @param {object} requestDetail
   * @param {string} requestDetail.protocol
   * @param {object} requestDetail.requestOptions
   * @param {object} requestDetail.requestData
   * @param {object} requestDetail.response
   * @param {number} requestDetail.response.statusCode
   * @param {object} requestDetail.response.header
   * @param {buffer} requestDetail.response.body
   * @returns
   */
  *beforeSendRequest(requestDetail) {
    return null;
  },


  /**
   *
   *
   * @param {object} requestDetail
   * @param {object} responseDetail
   */
  *beforeSendResponse(requestDetail, responseDetail) {
    /*if (!/qq\.com/i.test(requestDetail.url)) {
        return;
    }*/
    if(/mp\/profile_ext\?action=home/i.test(requestDetail.url)){//当链接地址为公众号历史消息页面时(第二种页面形式)
        try {
            var reg = /var msgList = \'(.*?)\';/;//定义历史消息正则匹配规则（和第一种页面形式的正则不同）
            var ret = reg.exec(responseDetail.response.body);//转换变量为string
            var urlObj = require('url').parse(requestDetail.url,true)
            var data = {
              "biz":urlObj['query']['__biz'],
              "msg_list":ret[1],
              "content_url":requestDetail.url
            }
            async function pushMagJson(data, url) {
                HttpPost(data,url);//这个函数是后文定义的，将匹配到的历史消息json发送到自己的服务器
            }
            pushMagJson(data, "/api/wechat/pushMsgJson");
            var nextContentUrl = '';
            const rp  = require('request-promise');
            var url = "http://jennycrawl.jerehu.com/api/wechat/getWxHis";
            async function useRequestPromise(){
                let options = {
                    method: 'GET',
                    uri: url,
                  };
                let rpbody = await rp(options);
                var rpObj = JSON.parse(rpbody);
                console.log("nex content_url:" + rpObj['msg']);
                nextContentUrl = rpObj['msg'];
            }
            return useRequestPromise().then(function() {
                const newResponse = responseDetail.response;
                delete(newResponse.header['Content-Security-Policy']);
                if (nextContentUrl) {
                    newResponse.body = newResponse.body.toString().replace(/\<\/html\>/, getHisCode(nextContentUrl) + "</html>");
                } else {
                    newResponse.body = "<html><script>setTimeout(function(){window.location.reload();},2000);</script></html>";
                }
                return { response: newResponse }
            });
        } catch(e) {
            console.log("爬取历史消息失败",e)
            return;
        }
    } else if(/mp\/profile_ext\?action=getmsg/i.test(requestDetail.url)){
    //历史消息页面第二种页面表现形式的向下翻页后的json
        try {
            var urlObj = require('url').parse(requestDetail.url,true)
            var json = JSON.parse(responseDetail.response.body)
            if (json.general_msg_list != []) {
                var data = {
                  "biz":urlObj['query']['__biz'],
                  "msg_list":json.general_msg_list,
                  "content_url":requestDetail.url
                }
                HttpPost(data,"/api/wechat/pushMsgJson");
                //这个函数和上面的一样是后文定义的，将第二页历史消息的json发送到自己的服务器
            }
        }catch(e){
            console.log("翻页状态推送历史消息页面失败",e)
        }
        return responseDetail
    } else if(/s\?__biz/i.test(requestDetail.url)){//当链接地址为公众号文章时
        try {
            var nextContentUrl = '';
            const rp  = require('request-promise');
            var url = "http://jennycrawl.jerehu.com/api/wechat/getWxHis";
            async function useRequestPromise(){
                let options = {
                    method: 'GET',
                    uri: url,
                  };
                let rpbody = await rp(options);
                var rpObj = JSON.parse(rpbody);
                console.log("nex content_url:" + rpObj['msg']);
                nextContentUrl = rpObj['msg'];
            }
            return useRequestPromise().then(function() {
                const newResponse = responseDetail.response;
                delete(newResponse.header['Content-Security-Policy']);
                if (nextContentUrl) {
                    newResponse.body = newResponse.body.toString().replace(/\<\/html\>/, "<script>setInterval(function(){window.location.href=\"" + nextContentUrl + "\";},2000);</script></html>");
                } else {
                    newResponse.body = "<html><script>setInterval(function(){window.location.reload();},2000);</script></html>";
                }
                return { response: newResponse }
            });
        }catch(e){
            console.log("爬取文章页面失败");
        }
    } else if(/mp\/getappmsgext/i.test(requestDetail.url)){//当链接地址为公众号文章阅读量和点赞量时
        try {
            var data = {
                "msg_ext":responseDetail.response.body.toString(),
                "content_url":requestDetail.requestOptions.headers['Referer'].toString()
            }
            //将文章阅读量点赞量的json发送到服务器
            HttpPost(data,"/api/wechat/pushMsgExt");
        }catch(e){
            console.log("爬取点赞和阅读数失败");
        }
    }
  },


  /**
   * default to return null
   * the user MUST return a boolean when they do implement the interface in rule
   *
   * @param {any} requestDetail
   * @returns
   */
  *beforeDealHttpsRequest(requestDetail) {
    return null;
  },

  /**
   *
   *
   * @param {any} requestDetail
   * @param {any} error
   * @returns
   */
  *onError(requestDetail, error) {
    //return null;
    return {
        response: {
          statusCode: 200,
          header: { 'content-type': 'text/html' },
          body: '<html><script>setTimeout(function(){window.location.reload();},2000);</script></html>'
        }
      };
  },


  /**
   *
   *
   * @param {any} requestDetail
   * @param {any} error
   * @returns
   */
  *onConnectError(requestDetail, error) {
    //return null;
    return {
        response: {
          statusCode: 200,
          header: { 'content-type': 'text/html' },
          body: '<html><script>setTimeout(function(){window.location.reload();},2000);</script></html>'
        }
    };
  },
};

function HttpPost(data,path) {//将json发送到服务器，str为json内容，url为历史消息页面地址，path是接收程序的路径和文件名
    var http = require('http');
    var content = require('querystring').stringify(data);
    var options = {
        method: "POST",
        host: "jennycrawl.jerehu.com",//注意没有http://，这是服务器的域名。
        port: 80,
        path: path,//接收程序的路径和文件名
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            "Content-Length": content.length
        }
    };
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    });
    req.on('error', function (e) {
        console.log('problem with request: ' + e);
    });
    //console.log(content)
    req.write(content);
    req.end();
}

function getHisCode(nextContentUrl) {
    /*var str = "<script src=\"https://cdn.bootcss.com/vue/2.5.21/vue.min.js\"></script>\n" +
        "<script>" +
        //alert(document.scrollingElement.scrollTop);
        //alert(document.scrollingElement.scrollHeight);
          //"while (document.scrollingElement.scrollTop != document.scrollingElement.scrollHeight) {" + 
          "var vm = new Vue({" +
            "el: \'body\'," + 
            "created: function() {" + 
              "Vue.nextTick(function() {" +
                "setTimeout(function() {" + 
                  //"alert(document.scrollingElement.scrollHeight);" +
                  "document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight);" + 
                  //"document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;" + 
                "}, 5000);" +
              "});" +
            "}" + 
          "})" +
          //"}" +
        "</script>";
    return str;*/
    var str = "<script>" +
          "var lastScrollHeight = 0;" +
          "var currentScrollHeight = 0;" +
          "setInterval(function(){" + 
            "currentScrollHeight = document.scrollingElement.scrollHeight;" +
            //"alert(document.scrollingElement.scrollTop + \",\" + document.scrollingElement.scrollHeight);" +
            "if (currentScrollHeight != lastScrollHeight) {" +
              "document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;" +
              "lastScrollHeight = currentScrollHeight;" +
            "} else {" +
              "setTimeout(function(){window.location.href=\"" + nextContentUrl + "\";},1000);" +
            "}" +
          "},2000);</script>";
    return str;
}

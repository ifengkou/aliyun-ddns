'use strict';
const http = require('http');
const alidns = require('./alidns.js');
const config = require('./config.json');

const simpleGetPubIpUrl = [
    'api.ipify.org',
    'canhazip.com',
    'ident.me',
    'whatismyip.akamai.com',
    'myip.dnsomatic.com']

const taobaoApi = {
    option: {
        host: "v6.ident.me",
        path: "/",
        method: "POST"
    },
    parser: body => {
        return body;
    }
}

function isValidIp(tmpstr)  
{  
        //CDCD:910A:2222:5498:8475:1111:3900:2020   
        var patrn=/^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;   
        var r=patrn.exec(tmpstr)  
        if(r)  
        {  
            return true;  
        }  
        if(tmpstr=="::"){  
            return true;  
        }  
        //F:F:F::1:1 F:F:F:F:F::1 F::F:F:F:F:1格式  
        patrn=/^(([0-9a-f]{1,4}:){0,6})((:[0-9a-f]{1,4}){0,6})$/i;   
        r=patrn.exec(tmpstr);  
        if(r)  
        {      
            var c=cLength(tmpstr);  
            if(c<=7 && c>0)  
            {  
                return true;  
            }  
        }                  
        //F:F:10F::  
        patrn=/^([0-9a-f]{1,4}:){1,7}:$/i;   
        r=patrn.exec(tmpstr);  
        if(r)  
        {  
            return true;  
        }  
        //::F:F:10F  
        patrn=/^:(:[0-9a-f]{1,4}){1,7}$/i;   
        r=patrn.exec(tmpstr);  
        if(r)  
        {  
            return true;  
        }  
        //F:0:0:0:0:0:10.0.0.1格式  
        patrn=/^([0-9a-f]{1,4}:){6}(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i;   
        r=patrn.exec(tmpstr);  
        if(r)  
        {  
            if(r[2]<=255 && r[3]<=255 &&r[4]<=255 && r[5]<=255 )  
            return true;  
        }  
        //F::10.0.0.1格式  
        patrn=/^([0-9a-f]{1,4}:){1,5}:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i;   
        r=patrn.exec(tmpstr);  
        if(r)  
        {  
            if(r[2]<=255 && r[3]<=255 &&r[4]<=255 && r[5]<=255 )  
                return true;  
        }  
        //::10.0.0.1格式  
        patrn=/^::(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i;   
        r=patrn.exec(tmpstr);  
        if(r)  
        {  
            if(r[1]<=255 && r[2]<=255 &&r[3]<=255 && r[4]<=255)  
                return true;  
        }  
        return false;  
}  

function getPubIpGeneric(option, parser, callback) {
    const req = http.request(option, res => {
        res.setEncoding('utf8');
        let body = '';
        res
            .on('data', chunk => body += chunk)
            .on('end', () => {
                body = parser(body);
                if (isValidIp(body)) {
                    callback(body);
                } else {
                    callback(null);
                }
            });
    });
    req.on('error', (e) => {
        callback(null);
    });
    req.end();
}

function pubIpApi() {
    let apiList = [];
    for (let i = 0; i < simpleGetPubIpUrl.length; ++i) {
        apiList[i] = {
            option: {
                host: simpleGetPubIpUrl[i],
                method: "GET"
            },
            parser: body => body.trim()
        };
    }
    apiList[simpleGetPubIpUrl.length] = taobaoApi;
    return apiList;
}

const apiList = pubIpApi();

function getPubIpRecur(callback, i) {
    if (i >= apiList.length) {
        callback(null);
        return;
    }
    getPubIpGeneric(apiList[i].option, apiList[i].parser, ip => {
        if (ip) {
            callback(ip);
        } else {
            getPubIpRecur(callback, i + 1);
        }
    });
}

function getPubIp(callback) {
    getPubIpRecur(callback, 0);
}

function main() {
    getPubIp(pubIp => {
        if (!pubIp) {
            console.log(new Date() + ': [noip]');
            return;
        }
        let hostnames = config.hostnames;
        for (let hostname of hostnames) {
            let target = {
                hostname: hostname,
                ip: pubIp
            };
            alidns.updateRecord(target, (msg) => {
                console.log(new Date() + ': [' + msg + '] ' + JSON.stringify(target));
            });
        }
    });
}

main();

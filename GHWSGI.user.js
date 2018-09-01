// ==UserScript==
// @name         Github Wiki Steamgifts Integration
// @namespace    GHWSGI
// @version      1.0
// @description  Integrate Github wikis into Steamgift discussion
// @author       knsys
// @downloadURL  https://github.com/knsys/GHWSGI/raw/master/GHWSGI.user.js
// @match        https://www.steamgifts.com/discussion/*/*
// @grant        GM.xmlHttpRequest
// @grant        GM.getResourceUrl
// @connect      github.com
// @connect      githubusercontent.com
// @resource     ghcss https://raw.githubusercontent.com/knsys/GHWSGI/ghwsgi.min.css
// ==/UserScript==

(function() {
    'use strict';

    const wikiLinkPrefix = 'wiki-gh-';
    const wikiSectionClass = "wiki-gh-content";
    addStyle();
    fillWikiLinks();

    async function addStyle(){
        const cssUrl = await GM.getResourceUrl('ghcss');
        $('head').append(`<link rel="stylesheet" href="${cssUrl}" type="text/css" />`);
    }

    async function fillWikiLinks(){
        $(`a[href^="${wikiLinkPrefix}"]`).each(async function() {
            await appendWikiFromLink($(this));
        });
    }

    async function appendWikiFromLink(link){
        let target = $( `<section><div></div></section>` );
        target.addClass(wikiSectionClass);
        let wikiHtml = await getRequest(generateRealUrlFromGitHub(link));
        let subDiv = $(target.children('div')[0]);
        subDiv.addClass('jumbotron');
        subDiv.html(cleanWikiPage(wikiHtml));
        link.replaceWith(target);
    }

    function generateRealUrlFromGitHub(link){
        return link.attr('href').replace(wikiLinkPrefix, 'https://github.com/');
    }

    function cleanWikiPage(html){
        var el = $( '<div></div>' );
        el.html(html);
        let wikiWrapper = $('#wiki-wrapper', el);
        $('#wiki-rightbar', wikiWrapper).remove();
        return wikiWrapper.html();
    }

    function getRequest(url) {
        return new Promise(function (resolve, reject) {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                headers: {
                    'Accept': 'text/html',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36'
                },
                onload: function(response) {
                    resolve(response.responseText);
                },
                onerror: function(response){
                    reject(response);
                }
            });
        });
    }
})();
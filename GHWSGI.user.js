// ==UserScript==
// @name         Github Wiki Steamgifts Integration
// @namespace    GHWSGI
// @version      1.0.1
// @description  Integrate Github wikis into Steamgift discussion
// @author       knsys
// @downloadURL  https://github.com/knsys/GHWSGI/raw/master/GHWSGI.user.js
// @match        https://www.steamgifts.com/discussion/*/*
// @grant        GM.xmlHttpRequest
// @grant        GM.getResourceUrl
// @grant        GM.addStyle
// @connect      github.com
// @connect      githubusercontent.com
// @resource     ghcss https://raw.githubusercontent.com/knsys/GHWSGI/master/ghwsgi.min.css
// @require      https://cdn.rawgit.com/showdownjs/showdown/1.8.6/dist/showdown.min.js
// ==/UserScript==

(function() {
    'use strict';

    const wikiLinkPrefix = 'wiki-gh';
    const wikiSectionClass = "wiki-gh-content";
    const githubBaseUrl = 'https://github.com';
    const githubMarkdownBaseUrl = 'https://raw.githubusercontent.com';
    const changeWikiModeClass = 'changeWikiMode';
    const defaultMode = "html";
    let mode = undefined;
    let wikiParser = undefined;

    /**
    * HTML Class
    */
    class HtmlWiki {
        constructor() {
            this.addStyle();
        }

        async addStyle(){
            const cssUrl = await GM.getResourceUrl('ghcss');
            $('head').append(`<link rel="stylesheet" href="${cssUrl}" type="text/css" />`);
            GM.addStyle('.wiki-gh-content .jumbotron{padding:2rem 1rem;margin-bottom:2rem;background-color:#e9ecef;border-radius:.3rem}');
        }

        getHtmlToDisplay(html){
            var el = $( '<div></div>' );
            el.html(html);
            let wikiWrapper = $('#wiki-wrapper', el);
            $('#wiki-rightbar', wikiWrapper).remove();
            // Update relative links to redirect to github page in a new tab
            let relativeLinks = $('a[href^="/"]', wikiWrapper);
            relativeLinks.each(async function() {
                $(this).attr('href', githubBaseUrl + $(this).attr('href'));
                $(this).attr('target', '_BLANK');
            });
            return wikiWrapper.html();
        }

        generateUrlFromLink({user, repo, type, pageUrl}){
            if (type !== 'wiki') return undefined;
            return `${githubBaseUrl}/${user}/${repo}/${type}/${pageUrl}`;
        }
    }

    /**
    * Markdown Class
    */
     class MarkDownWiki {
        constructor() {
            this.addStyle();
        }

        addStyle(){
            GM.addStyle('.wiki-gh-content .jumbotron{padding:2rem 1rem;margin-bottom:2rem;background-color:#e9ecef;border-radius:.3rem}');
        }

        getHtmlToDisplay(markdown){
            const converter = new showdown.Converter();
            converter.setFlavor('github');
            return converter.makeHtml(markdown);
        }

        generateUrlFromLink({user, repo, type, pageUrl}){
            return `${githubMarkdownBaseUrl}/${type}/${user}/${repo}/${pageUrl}.md`;
        }
    }

    bootstrap();
    function bootstrap(){
        mode = getLocalStorageValue('mode', defaultMode);
        wikiParser = (mode === 'html') ? new HtmlWiki() : new MarkDownWiki();
        fillWikiLinks(wikiParser);
    }

     async function fillWikiLinks(wikiParser){
        $(`a[href^="${wikiLinkPrefix}"]`).each(async function() {
            await appendWikiFromLink($(this), wikiParser);
        });
    }

    async function appendWikiFromLink(link, wikiParser){
        const html = await _getWikiHtml(link, wikiParser);
        const dom = _generateContainerDom();
        dom.subDiv.html(html);
        link.replaceWith(dom.target);
        _updateChangeWikiTriggers();
    }

    async function _getWikiHtml(link, wikiParser){
        const linkParams = _segmentLinkParameters(link);
        const url = wikiParser.generateUrlFromLink(linkParams);
        if (url === undefined) return;
        let wikiResponse = await getRequest(url);
        return wikiParser.getHtmlToDisplay(wikiResponse);
    }

    function _generateContainerDom(){
        const changeWikiHtml = _getChangeWikiHtml();
        let target = $( `<section>${changeWikiHtml}<div></div></section>` );
        target.addClass(wikiSectionClass);
        let subDiv = $(target.children('div')[1]);
        subDiv.addClass('jumbotron');
        return {target, subDiv};
    }

    function _segmentLinkParameters(link){
        const params = link.attr('href').split('/');
        if (params.length === 4) params.push('Home');
        const pageUrl =  (params.length > 5) ? params.slice(4).join('/') : params[4];
        return {user: params[1], repo: params[2], type: params[3], pageUrl: pageUrl};
    }

    function _getChangeWikiHtml(){
        let current = (mode === 'html') ? 'Github Style': 'SG Style';
        return `<div class="${changeWikiModeClass}" style="cursor: pointer"><i class="fa fa-retweet" style="vertical-align: initial;margin-right: 0.5rem;"></i><span>Change Wiki Mode (Current: ${current})</span></div>`;
    }

    function _updateChangeWikiTriggers(){
        $(`.${changeWikiModeClass}`).off('click');
        $(`.${changeWikiModeClass}`).on("click", function() {
            if (mode === 'html') setLocalStorageValue('mode', 'markdown');
            else setLocalStorageValue('mode', 'html');
            location.reload();
        });
    }

    /**
    * Requests utils functions
    */
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

    /**
    * LocalStorage Management
    */
    function setLocalStorageValue(key, newValue) {
        localStorage.setItem(`ghwsgi-${key}`, newValue);
    }

    function getLocalStorageValue(key, defaultValue = undefined) {
        return localStorage.getItem(`ghwsgi-${key}`) || defaultValue;
    }
})();
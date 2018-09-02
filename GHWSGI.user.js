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
    const defaultMode = "html";
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
        addNavMenuEntry();
        const mode = getLocalStorageValue('mode', defaultMode);
        wikiParser = (mode === 'html') ? new HtmlWiki() : new MarkDownWiki();
        fillWikiLinks(wikiParser);
    }

    function addNavMenuEntry(){
        const navMenuEntry = '<div class="nav__button-container"><a class="nav__button" href="#">GHWSGI</a></div>';
        $('.nav__left-container').append(navMenuEntry);
    }

     async function fillWikiLinks(wikiParser){
        $(`a[href^="${wikiLinkPrefix}"]`).each(async function() {
            await appendWikiFromLink($(this), wikiParser);
        });
    }

    async function appendWikiFromLink(link, wikiParser){
        let target = $( `<section><div></div></section>` );
        target.addClass(wikiSectionClass);
        const linkParams = segmentLinkParameters(link);
        const url = wikiParser.generateUrlFromLink(linkParams);
        if (url === undefined) return;
        let wikiResponse = await getRequest(url);
        let subDiv = $(target.children('div')[0]);
        subDiv.addClass('jumbotron');
        const html = wikiParser.getHtmlToDisplay(wikiResponse);
        subDiv.html(html);
        link.replaceWith(target);
    }

    function segmentLinkParameters(link){
        const params = link.attr('href').split('/');
        if (params.length === 4) params.push('Home');
        const pageUrl =  (params.length > 5) ? params.slice(4).join('/') : params[4];
        return {user: params[1], repo: params[2], type: params[3], pageUrl: pageUrl};
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
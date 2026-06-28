// @ts-ignore
import $ from 'jquery'
import _ from 'lodash'
// @ts-ignore
import Cookies from 'js-cookie'
import { fetchToGetLikeUsers, fetchToGetVideoBlobByXHR } from '../utils/fetches'
import { weiboExtendClassNames, weiboExtendVirtualRootId } from '../utils/constants'
import { updateBlackUserList, updateBlackLikeText } from '../reactVirtual/slice'
import { injectVirtualRoot, injectVirtualStyle } from './injects'
import store from '../reactVirtual/store'
import { POST_MSG_TYPE } from '../utils/interface'
import fansContent from './fansContent'
import { matchImageOrVideoFromUrl } from '../utils/tools'

const contentRun = async () => {
    console.log(`this is contentRun`)

    fansContent()

    const { base: WEC_base, blockLikeUsers: WEC_blockLikeUsers, downloadPost: WEC_downloadPost } = weiboExtendClassNames
// 抽出公共逻辑：给指定的"图标容器"插入点赞列表按钮
    const insertLikeListBtn = ({
        $iconBox,
        $commentIdHost,
    }: {
        $iconBox: any
        $commentIdHost: any
    }) => {
        if ($iconBox.length < 1) return
        if ($iconBox.find(`.${WEC_blockLikeUsers}`).length >= 1) return

        const commentIdDom = $commentIdHost.find(`.${weiboExtendClassNames.commentId}`)
        const commentText = commentIdDom?.parent()?.text() || ''
        const commentId = commentIdDom?.data('cid') || ''
        if (!commentId) return

        const weiboExtendBlackBtn = $(`<div>`)
            .text('点赞列表')
            .addClass(
                `${WEC_base} ${WEC_blockLikeUsers} wbpro-iconbed woo-box-flex woo-box-alignCenter woo-box-justifyCenter optHover`
            )
            .css('width', '80px')
            .prependTo($iconBox)
        weiboExtendBlackBtn.click(async () => {
            const likeUsers = await fetchToGetLikeUsers({ commentId: commentId })
            console.log(`likeUsers`, likeUsers)
            console.log(`commentText`, commentText)
            store.dispatch(updateBlackUserList({ blackUserList: likeUsers?.userList || [] }))
            store.dispatch(updateBlackLikeText({ blackLikeText: commentText }))
        })
    }

    // 情况一：首屏 / 一级评论结构 .wbpro-list > .item1 > .item1in
    $(document).on('mouseover', '.wbpro-list', (event: $.Event) => {
        const targetElement = event.currentTarget as HTMLElement
        const item1 = $(targetElement).find('.item1')
        const item1In = item1.find(`.item1in`)
        const item1IconBox = item1In.find(`.opt.woo-box-flex`)
        insertLikeListBtn({ $iconBox: item1IconBox, $commentIdHost: item1In })
    })

    // 情况二：弹层"全部回复"里楼中楼结构 .item2 > .con2
    $(document).on('mouseover', '.item2', (event: $.Event) => {
        const targetElement = event.currentTarget as HTMLElement
        const $item2 = $(targetElement)
        const con2 = $item2.find('.con2')
        if (con2.length < 1) return
        const iconBox = con2.find('.opt.woo-box-flex')
        insertLikeListBtn({ $iconBox: iconBox, $commentIdHost: con2 })
    })

    $(document).on('mouseover', 'div[video-active=true]', (event: $.Event) => {
        const videoParentElement = event.currentTarget as HTMLVideoElement
        const $parent = $(videoParentElement)
        const $videoElement = $parent.find('video')
        let videoUrl = $videoElement.attr('src')
        if ($parent.find('.hover_download_video').length < 1) {
            const $hoverText = $(`<span>`).text(`下载视频`)
            const $hoverInfo = $('<div>').addClass('hover_download_video').append($hoverText).css({
                position: 'absolute',
                'z-index': 999,
                top: '12px',
                right: '12px',
                cursor: 'pointer',
                color: 'white',
                'font-weight': 'bold',
                display: 'block',
            })
            $hoverInfo.click(async function () {
                videoUrl = videoUrl || $videoElement.attr('src')
                const vidoeName = matchImageOrVideoFromUrl(videoUrl) || `${new Date().getTime()}.mp4`
                const blob = await fetchToGetVideoBlobByXHR({ videoUrl: videoUrl.replace(/\&ab=[\w\W].*?\&/, '&') })
                let downloadUrl = videoUrl
                let a = document.createElement('a')
                if (blob) {
                    downloadUrl = URL.createObjectURL(blob)
                    a.download = vidoeName
                }
                a.target = '_blank'
                a.href = downloadUrl
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(downloadUrl)
            })
            $parent.append($hoverInfo)
        } else {
            $parent.find('.hover_download_video').css({ display: 'block' })
        }
    })
    $(document).on('mouseleave', 'div[video-active=true]', (event: $.Event) => {
        const videoParentElement = event.currentTarget as HTMLVideoElement
        $(videoParentElement).find('.hover_download_video').css({ display: 'none' })
    })

    // $(document).on('DOMNodeInserted', 'div.wbpro-scroller-item', function () {
    //     // @ts-ignore
    //     const $current = $(this)
    //     if ($current.find(`.${WEC_downloadPost}`).length < 1) {
    //         const $currentHeader = $current.find('header')
    //         console.log(`currentHeader`, $currentHeader)
    //         const $timeHref = findAnchor($currentHeader, new RegExp(/weibo\.com\/\d+(\S)+/g))
    //         if ($timeHref) {
    //             console.log(`href`, $timeHref.attr('href'))
    //             const $parent = $timeHref.parent()
    //             console.log(`$parent`, $parent.attr('class'))
    //             const $downloadPostBtn = $('<div>')
    //                 .addClass(`${WEC_downloadPost}`)
    //                 .css({
    //                     position: 'absolute',
    //                     right: '20px',
    //                     cursor: 'pointer',
    //                 })
    //                 .append('<span>')
    //                 .text('下载此微博及评论')
    //             $parent.append($downloadPostBtn)
    //         }
    //     }
    // })
}

// 监听页面的加载完成事件, 注入自定义脚本到页面中
window.addEventListener('load', () => {
    const xsrfToken = Cookies.get(`XSRF-TOKEN`)
    globalThis.xsrfToken = xsrfToken
    getMyUid()
    injectVirtualRoot()
    injectVirtualStyle()

    contentRun()
})

window.addEventListener('message', function (event) {
    if (event.source === window && event.data.action === POST_MSG_TYPE.historyChagne) {
        console.log(event.data.action, event.data.url, document.location.href)
        console.log(`globalThis.myUid `, globalThis.myUid)
        fansContent()
    }
})

const getMyUid = () => {
    let myUid = ''
    $(document).ready(function () {
        const navDiv = $('div.woo-tab-nav')
        const myPageLink = navDiv?.find('a[href*="/u/"]')

        if (myPageLink.length > 0) {
            const myPageLinkValue = myPageLink.attr('href')
            myUid = (myPageLinkValue && myPageLinkValue.match(/\/u\/([\w\W]+)/)?.[1]) || ``
            globalThis.myUid = myUid
            console.log(`globalThis.myUid`, myUid)
        } else {
            // 没有找到满足条件的链接
            console.log('没有找到含有 "weibo" 字样的链接。')
        }
    })
    console.log(`myUid`, myUid)
    return myUid
}

var findAnchor = function ($container: any, reg: RegExp) {
    const $theAnchor = $container.find('a').filter(function () {
        // @ts-ignore
        return this.href.match(reg)
    })

    return $theAnchor?.length ? $theAnchor : null
}

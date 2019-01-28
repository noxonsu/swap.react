import React, { Fragment } from 'react'
import { withRouter, HashRouter } from 'react-router-dom'
import PropTypes from 'prop-types'
import actions from 'redux/actions'
import { connect } from 'redaction'
import moment from 'moment-with-locales-es6'
import { constants, localStorage } from 'helpers'
import { isMobile } from 'react-device-detect'

import CSSModules from 'react-css-modules'
import styles from './App.scss'
import 'scss/app.scss'

import { createSwapApp } from 'instances/newSwap'
import Core from 'containers/Core/Core'

import Header from 'components/Header/Header'
import Footer from 'components/Footer/Footer'
import Loader from 'components/loaders/Loader/Loader'
import PreventMultiTabs from 'components/PreventMultiTabs/PreventMultiTabs'
import RequestLoader from 'components/loaders/RequestLoader/RequestLoader'
import ModalConductor from 'components/modal/ModalConductor/ModalConductor'
import WidthContainer from 'components/layout/WidthContainer/WidthContainer'
import NotificationConductor from 'components/notification/NotificationConductor/NotificationConductor'
import Seo from 'components/Seo/Seo'

import config from 'app-config'


const memdown = require('memdown')


const userLanguage = (navigator.userLanguage || navigator.language || 'en-gb').split('-')[0]
moment.locale(userLanguage)

@withRouter
@connect({
  isVisible: 'loader.isVisible',
  ethAddress: 'user.ethData.address',
  btcAddress: 'user.btcData.address',
  tokenAddress: 'user.tokensData.swap.address',
})
@CSSModules(styles)
export default class App extends React.Component {

  static propTypes = {
    children: PropTypes.element.isRequired,
  }

  constructor() {
    super()

    this.localStorageListener = null

    this.state = {
      fetching: false,
      multiTabs: false,
      error: '',
    }
  }

  componentWillMount() {
    const myId = Date.now().toString()
    localStorage.setItem(constants.localStorage.enter, myId)
    const enterSub = localStorage.subscribe(constants.localStorage.enter, () => {
      localStorage.setItem(constants.localStorage.reject, myId)
    })
    const rejectSub = localStorage.subscribe(constants.localStorage.reject, (id) => {
      if (id && id !== myId) {
        this.setState({ multiTabs: true })
        localStorage.unsubscribe(rejectSub)
        localStorage.unsubscribe(enterSub)
        localStorage.removeItem(constants.localStorage.reject)
      }
    })

    if (!localStorage.getItem(constants.localStorage.demoMoneyReceived)) {
      actions.user.getDemoMoney()
    }

    actions.firebase.initialize()
  }

  componentDidMount() {
    window.actions = actions

    window.onerror = (error) => {
      actions.analytics.errorEvent(error)
    }

    const db = indexedDB.open('test')
    db.onerror = () => {
      window.leveldown = memdown
    }

    setTimeout(() => {
      actions.user.sign()
      createSwapApp()
      this.setState({ fetching: true })
    }, 1000)
  }

  render() {
    const { fetching, multiTabs, error } = this.state
    const { children, ethAddress, btcAddress, tokenAddress, history /* eosAddress */ } = this.props
    const isFetching = !ethAddress || !btcAddress || (!tokenAddress && config && !config.isWidget) || !fetching

    if (multiTabs) {
      return <PreventMultiTabs />
    }

    if (isFetching) {
      return <Loader showTips />
    }

    const mainContent = (
      <Fragment>
        <Seo location={history.location} />
        <Header />
        <WidthContainer styleName="main">
          <main>
            {children}
          </main>
        </WidthContainer>
        <Core />
        { !isMobile && <Footer /> }
        <RequestLoader />
        <ModalConductor />
        <NotificationConductor />
      </Fragment>
    )

    return (
      process.env.LOCAL === 'local' ? (
        <HashRouter>
          {mainContent}
        </HashRouter>
      ) : (
        mainContent
      )
    )
  }
}

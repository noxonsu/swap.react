import React, { Component } from 'react'

import { connect } from 'redaction'
import actions from 'redux/actions'
import { Link, withRouter } from 'react-router-dom'

import { links, constants } from 'helpers'

import CSSModules from 'react-css-modules'
import styles from './CurrencyWallet.scss'

import Row from 'pages/History/Row/Row'
import SwapsHistory from 'pages/History/SwapsHistory/SwapsHistory'

import Table from 'components/tables/Table/Table'
import { Button } from 'components/controls'
import PageHeadline from 'components/PageHeadline/PageHeadline'
import PageSeo from 'components/Seo/PageSeo'
import { getSeoPage } from 'helpers/seo'
import { FormattedMessage, injectIntl, defineMessages } from 'react-intl'
import ReactTooltip from 'react-tooltip'
import CurrencyButton from 'components/controls/CurrencyButton/CurrencyButton'
import { localisedUrl } from 'helpers/locale'


const titles = [
  <FormattedMessage id="currencyWallet27"  defaultMessage="Coin" />,
  <FormattedMessage id="currencyWallet28"  defaultMessage="Status" />,
  <FormattedMessage id="currencyWallet29"  defaultMessage="Statement" />,
  <FormattedMessage id="currencyWallet30"  defaultMessage="Amount" />,
]

@connect(({ core, user,  history: { transactions, swapHistory },
  user: { ethData, btcData, ltcData, tokensData, eosData, nimData, usdtData, telosData } }) => ({
  items: [ ethData, btcData, eosData, usdtData, ltcData, telosData, ...Object.keys(tokensData).map(k => (tokensData[k])) /* nimData */ ],
  user,

  hiddenCoinsList: core.hiddenCoinsList,
  txHistory: transactions,
  swapHistory,
}))

@injectIntl
@withRouter
@CSSModules(styles)
export default class CurrencyWallet extends Component {

  constructor() {
    super()

    this.state = {
      currency: null,
      address: null,
      contractAddress: null,
      decimals: null,
      balance: null,
      isBalanceEmpty: false,
    }
  }

  static getDerivedStateFromProps({ match: { params: { fullName } }, intl: { locale }, items, history }) {
    const item = items.map(item => item.fullName.toLowerCase())

    if (item.includes(fullName.toLowerCase())) {
    const itemCurrency = items.filter(item => item.fullName.toLowerCase() === fullName.toLowerCase())[0]

      const {
        currency,
        address,
        contractAddress,
        decimals,
        balance,
      } = itemCurrency

      return {
        currency,
        address,
        contractAddress,
        decimals,
        balance,
        isBalanceEmpty: balance === 0,
      }
    }
    history.push(localisedUrl(locale, `${links.notFound}`))
  }

  componentDidMount() {
    const { currency } = this.state

    if (currency) {
      actions.analytics.dataEvent(`open-page-${currency.toLowerCase()}-wallet`)
    }
    actions.user.setTransactions()
    actions.core.getSwapHistory()
  }

  handleReceive = () => {
    const { currency, address } = this.state

    actions.modals.open(constants.modals.ReceiveModal, {
      currency,
      address,
    })
  }

  handleWithdraw = () => {
    let { match:{ params: { fullName } }, items } = this.props
    const {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
      isBalanceEmpty,
    } = this.state

    actions.analytics.dataEvent(`balances-withdraw-${currency.toLowerCase()}`)
    actions.modals.open(constants.modals.Withdraw, {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
    })
  }

  handleGoTrade = (currency) => {
    const { intl: { locale } } = this.props
    this.props.history.push(localisedUrl(locale, `/${currency.toLowerCase()}`))
  }

  handleEosBuyAccount = async () => {
    actions.modals.open(constants.modals.EosBuyAccount)
  }

  render() {

    let { swapHistory, txHistory, location, match:{ params: { fullName } },  intl } = this.props
    const {
      currency,
      address,
      contractAddress,
      decimals,
      balance,
      isBalanceEmpty,
    } = this.state

    txHistory = txHistory
      .filter(tx => tx.type === currency.toLowerCase())

    swapHistory = Object.keys(swapHistory)
      .map(key => swapHistory[key])
      .filter(swap => swap.sellCurrency === currency || swap.buyCurrency === currency)

    const seoPage = getSeoPage(location.pathname)
    const eosAccountActivated = localStorage.getItem(constants.localStorage.eosAccountActivated) === 'true'
    const title = defineMessages({
      metaTitle: {
        id: 'CurrencyWallet148',
        defaultMessage: 'Swap.Online - ${fullName} (${currency}) Web Wallet with Atomic Swap.',
      },
    })
    const description = defineMessages({
      metaDescription: {
        id: 'CurrencyWallet154',
        defaultMessage: 'Atomic Swap Wallet allows you to manage and securely exchange ${fullName} (${currency}) with 0% fees. Based on Multi-Sig and Atomic Swap technologies.',
      },
    })

    return (
      <div className="root">
        <PageSeo
          location={location}
          defaultTitle={intl.formatMessage(title.metaTitle, { fullName, currency  })}
          defaultDescription={intl.formatMessage(description.metaDescription, { fullName, currency  })} />
        <PageHeadline
          styleName="title"
          subTitle={!!seoPage
            ? seoPage.h1
            : <FormattedMessage
              id="CurrencyWallet141"
              defaultMessage={`Swap.Online - {fullName}({currency}) Web Wallet with Atomic Swap.`}
              values={{
                fullName:`${fullName}`,
                currency: `${currency}`,
              }}
            />}
        />
        <h3 styleName="subtitle">
          <FormattedMessage
            id="CurrencyWallet168"
            defaultMessage={`Your address: {address}{br}Your {fullName} balance: {balance} {currency}`}
            values={{
              address:  <span>{address}</span>,
              br: <br />,
              fullName: `${fullName}`,
              balance: `${balance}`,
              currency: `${currency}`,
            }}
          />
        </h3>
        {currency === 'EOS' && !eosAccountActivated && (<Button onClick={this.handleEosBuyAccount} gray>
          <FormattedMessage id="CurrencyWallet105" defaultMessage="Activate account" />
        </Button>)}
        <div styleName="inRow">
          <CurrencyButton
            onClick={this.handleReceive}
            dataTooltip={{
              id: `deposit${currency}`,
              deposit: 'true',
            }}
          >
            <FormattedMessage id="Row313" defaultMessage="Deposit" />
          </CurrencyButton>
          <CurrencyButton
            onClick={this.handleWithdraw}
            disable={isBalanceEmpty}
            dataTooltip={{
              id: `send${currency}`,
              isActive: isBalanceEmpty,
            }}
          >
            <FormattedMessage id="CurrencyWallet100" defaultMessage="Send" />
          </CurrencyButton>
          <Button gray onClick={() => this.handleGoTrade(currency)}>
            <FormattedMessage id="CurrencyWallet104" defaultMessage="Exchange" />
          </Button>
        </div>
        { swapHistory.length > 0 && <SwapsHistory orders={swapHistory.filter(item => item.step >= 4)} /> }
        <h2 style={{ marginTop: '20px' }} >
          <FormattedMessage id="CurrencyWallet110" defaultMessage="History your transactions" />
        </h2>
        {txHistory && (<Table titles={titles} rows={txHistory}styleName="table" rowRender={(row) => (<Row key={row.hash} {...row} />)} />)}
        {
          seoPage && seoPage.footer && <div>{seoPage.footer}</div>
        }
      </div>
    )
  }
}

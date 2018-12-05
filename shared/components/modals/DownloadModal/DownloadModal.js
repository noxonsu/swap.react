import React, { Fragment } from 'react'
import PropTypes from 'prop-types'

import { connect } from 'redaction'
import actions from 'redux/actions'

import cssModules from 'react-css-modules'
import styles from './DownloadModal.scss'

import Modal from 'components/modal/Modal/Modal'
import Button from 'components/controls/Button/Button'
import CopyToClipboard from 'react-copy-to-clipboard'

import { FormattedMessage } from 'react-intl'


@connect(
  ({
    currencies,
    user: { ethData, btcData, /* bchData, */ tokensData, eosData, telosData, nimData, usdtData, ltcData },
  }) => ({
    currencies: currencies.items,
    items: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ],
    tokenItems: [ ...Object.keys(tokensData).map(k => (tokensData[k])) ],
  })
)
@cssModules(styles)
export default class DownloadModal extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      isTextCopied: false,
    }
  }

  handleCopyText = () => {
    this.setState({
      isTextCopied: true,
    }, () => {
      setTimeout(() => {
        this.setState({
          isTextCopied: false,
        })
      }, 15 * 1000)
    })
  }

  render() {
    const { isTextCopied } = this.state
    const { items, name } = this.props

    const textToCopy = actions.user.getText()

    const account = () => (
      items.map(item => (
        <Fragment>
          <p styleName="content">
            {item.fullName}
            {(`${item.currency}` === 'EOS' || `${item.currency}` === 'TLOS') ?
              <FormattedMessage  id={`${item.currency}124`} defaultMessage=" Account name: "  /> :
              <FormattedMessage  id={`${item.currency}123`} defaultMessage=" address: "  /> }
          </p>
          <p>{item.address}</p>
          <p styleName="content">
            {item.fullName}
            {(`${item.currency}` === 'EOS') && <FormattedMessage  id={`${item.currency}321`} defaultMessage=" Master Private key: "  />}
            {(`${item.currency}` === 'TLOS') && <FormattedMessage  id={`${item.currency}321`} defaultMessage=" Active Private key: "  />}
            {(`${item.currency}` !== 'TLOS' && `${item.currency}` !== 'EOS') && <FormattedMessage  id={`${item.currency}321`} defaultMessage=" Private key: "  />}
          </p>
          <p>{item.privateKey}</p>
        </Fragment>
      ))
    )

    return (
      <Modal name={name} title="We don`t store your private keys and will not be able to restore them!">
        <div styleName="subTitle">
          <FormattedMessage id="down57" defaultMessage="It seems like you're using an IPhone or an IPad." />
          <FormattedMessage id="down58" defaultMessage=" Just copy this keys and paste into notepad textarea." />
          <FormattedMessage id="down59" defaultMessage=" Or make the screen shot" />
        </div>
        <CopyToClipboard text={textToCopy} onCopy={this.handleCopyText}>
          <Button styleName="button" brand disabled={isTextCopied}>
            { isTextCopied ?
              <FormattedMessage id="down64" defaultMessage="Address copied to clipboard" /> :
              <FormattedMessage id="down65" defaultMessage="Copy to clipboard" />
            }
          </Button>
        </CopyToClipboard>
        <div styleName="indent">
          {account()}
        </div>
      </Modal>
    )
  }
}

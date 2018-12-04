import React from 'react'
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
    const { name, items: [ ethData, btcData, eosData, telosData, /* bchData, */ ltcData, usdtData /* nimData */ ] } = this.props
    const { isTextCopied } = this.state

    const text = actions.user.getText()

    return (
      <Modal name={name} title="We don`t store your private keys and will not be able to restore them!">
        <div styleName="subTitle">
          <p1><FormattedMessage id="down57" defaultMessage="It seems like you're using an IPhone or an IPad." /></p1>
          <p1><FormattedMessage id="down58" defaultMessage="Just copy this keys and paste into notepad textarea" /> </p1>
          <p1><FormattedMessage id="down59" defaultMessage="Or make the screen shot" /> </p1>
        </div>
        <CopyToClipboard text={text} onCopy={this.handleCopyText}>
          <Button styleName="button" brand disabled={isTextCopied}>
            { isTextCopied ?
              <FormattedMessage id="down64" defaultMessage="Address copied to clipboard" /> :
              <FormattedMessage id="down65" defaultMessage="Copy to clipboard" />
            }
          </Button>
        </CopyToClipboard>
        <div styleName="content">
          <p1><FormattedMessage id="down70" defaultMessage="Ethereum address: " /></p1>
          <p>{ethData.address}</p>
          <p1><FormattedMessage id="down71" defaultMessage="Ethereum Private key: " /></p1>
          <p>{ethData.privateKey}</p>

          <p1><FormattedMessage id="down73" defaultMessage="Bitcoin address: " /></p1>
          <p>{btcData.address}</p>
          <p1><FormattedMessage id="down74" defaultMessage="Bitcoin Private key: " /></p1>
          <p>{btcData.privateKey}</p>

          <p1><FormattedMessage id="down76" defaultMessage="EOS Master Private Key: " /></p1>
          <p>{eosData.masterPrivateKey}</p>
          <p1><FormattedMessage id="down77" defaultMessage="EOS Account name: " /></p1>
          <p>{eosData.address}</p>

          <p1><FormattedMessage id="down79" defaultMessage="TELOS Active Private Key: " /></p1>
          <p>{telosData.activePrivateKey}</p>
          <p1><FormattedMessage id="down80" defaultMessage="TELOS Account name: " /></p1>
          <p>{telosData.address}</p>

          <p1><FormattedMessage id="down81" defaultMessage="Litecoin address: " /></p1>
          <p>{ltcData.address}</p>
          <p1><FormattedMessage id="down83" defaultMessage="Litecoin Private key: " /></p1>
          <p>{ltcData.privateKey}</p>
        </div>
      </Modal>
    )
  }
}

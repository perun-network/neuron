/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useEffect } from 'react'
import { useState as useGlobalState, useDispatch } from 'states'
import { useTranslation } from 'react-i18next'

import {
  ConnectionStatus,
  SyncStatus,
  shannonToCKBFormatter,
  getCurrentUrl,
  getSyncStatus,
  clsx,
  useClearGeneratedTx,
} from 'utils'

import PageContainer from 'components/PageContainer'
import CopyZone from 'widgets/CopyZone'
import { Attention, EyesClose, EyesOpen } from 'widgets/Icons/icon'
import { HIDE_BALANCE } from 'utils/const'
import hooks from 'components/NervosDAO/hooks'
import { Form, Container, Button, Modal } from 'react-bootstrap'
import { BiPlus, BiX } from 'react-icons/bi'
// import { AddressEncoder } from '@polycrypt/perun-wallet-wrapper/src/translator'
// import { mkSimpleChannelServiceClient } from '@polycrypt/perun-wallet-wrapper/src/client'
// import { Allocation, Balance, Balances, State } from '@polycrypt/perun-wallet-wrapper/src/wire'
import styles from './perun.module.scss'
import { Allocation, Balance, Balances, ChannelState } from './types'

function stringToUint8Array(ethAddress: string): Uint8Array {
  // Remove the "0x" prefix if present
  if (ethAddress.startsWith('0x')) {
    // eslint-disable-next-line no-param-reassign
    ethAddress = ethAddress.slice(2)
  }

  // Parse the hex string into a Uint8Array
  const uint8Array = new Uint8Array(ethAddress.length / 2)
  for (let i = 0; i < ethAddress.length; i += 2) {
    const byte = parseInt(ethAddress.substr(i, 2), 16)
    uint8Array[i / 2] = byte
  }

  return uint8Array
}

const Perun = () => {
  const {
    wallet,
    nervosDAO: { records },
    chain: {
      connectionStatus,
      syncState: { cacheTipBlockNumber, bestKnownBlockNumber, bestKnownBlockTimestamp },
      networkID,
    },
    settings: { networks },
  } = useGlobalState()
  const dispatch = useDispatch()
  const [t, { language }] = useTranslation()
  const [isPrivacyMode, setIsPrivacyMode] = useState(false)
  const [withdrawList, _setWithdrawList] = useState<Map<string, string | null>>(new Map())
  const [globalAPC, setGlobalAPC] = useState(0)
  const [genesisBlockTimestamp, setGenesisBlockTimestamp] = useState<number | undefined>(undefined)
  const [amount, setAmount] = useState<number>()
  const [updateAmount, setUpdateAmount] = useState<number>()
  const [peerAddress, setPeerAddress] = useState('')
  const [challengeDuration, setChallengeDuration] = useState<number>()
  const [validInputs, setValidInputs] = useState(false)
  const clearGeneratedTx = useClearGeneratedTx()
  const [channels] = useState(new Map<Uint8Array, ChannelState>())
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  // const [rejectionReason, setRejectionReason] = useState('')
  const [updateChannelDialog, setUpdateChannelDialog] = useState(false)
  const [channelID, setChannelID] = useState<Uint8Array>()
  const [showState, setShowState] = useState<ChannelState>()
  const [showInfo, setShowInfo] = useState(false)

  const generateRandomString = (length: number) => {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }

  const handleAmountChange = (am: string) => {
    const amountNum = parseFloat(am)
    if (Number.isNaN(amountNum)) {
      return
    }
    setAmount(amountNum)
  }

  const handleUpdateAmountChange = (am: string) => {
    const amountNum = parseFloat(am)
    if (Number.isNaN(amountNum)) {
      return
    }
    setUpdateAmount(amountNum)
  }

  const handlePeerAddressChange = (ad: string) => {
    setPeerAddress(ad)
  }

  const handleChallengeDurationChange = (cd: string) => {
    const cdNum = parseFloat(cd)
    if (Number.isNaN(cdNum)) {
      return
    }
    setChallengeDuration(cdNum)
  }

  /* const handleRejected = (reason: React.SetStateAction<string>) => {
    setRejectionReason(reason)
    setShowRejectionModal(true)
  } */

  const handleCloseRejectionModal = () => {
    setShowRejectionModal(false)
  }

  /* const addressEncoder: AddressEncoder = (add: Uint8Array | string) => {
    if (typeof add === 'string') {
      return stringToUint8Array(add)
    }
    return add
  } */

  // const serviceClient = mkSimpleChannelServiceClient(addressEncoder, wallet.addresses[0].address)

  // Create an instance of ServiceClient
  // const serviceClient = mkSimpleChannelServiceClient(addrEncoder, 'your_endpoint_address')

  useEffect(() => {
    if (amount && peerAddress && challengeDuration) {
      setValidInputs(true)
    }
  }, [amount, peerAddress, challengeDuration])

  useEffect(() => {
    if (showState !== undefined) {
      setShowInfo(true)
    }
  }, [showState])

  const handleOpenChannel = () => {
    /* serviceClient
      .openChannel(
        stringToUint8Array(wallet.addresses[0].address),
        stringToUint8Array(peerAddress),
        Allocation.create({
          assets: [new Uint8Array()],
          balances: Balances.create({
            balances: [
              Balance.create({ balance: [stringToUint8Array(amount!.toString())] }),
              Balance.create({ balance: [new Uint8Array()] }),
            ],
          }),
          locked: [],
        }),
        Number(challengeDuration) as number
      )
      .then((resp: { rejected?: any; channelId?: any }) => {
        // Check if the response contains a "rejected" field
        if (resp.rejected) {
          // Handle the rejection case
          const reason = resp.rejected.reason || 'Unknown reason'
          handleRejected(reason)
        } else {
          // Handle the success case
          const { channelId } = resp
          channels.set(
            channelId!,
            new ChannelState(
              channelId!,
              0,
              stringToUint8Array('0x0000000000000000000000000000000000000000'),
              Allocation.create({
                assets: [new Uint8Array()],
                balances: Balances.create({
                  balances: [
                    Balance.create({ balance: [stringToUint8Array(amount!.toString())] }),
                    Balance.create({ balance: [new Uint8Array()] }),
                  ],
                }),
                locked: [],
              }),
              new Uint8Array(),
              false
            )
          )
        }
      })
      .catch((error: any) => {
        // Handle any errors that occur during the request
        console.error('Error opening the channel:', error)
      }) */
    // remove following code once wallet-wrapper is integrated.
    const channelId = stringToUint8Array(generateRandomString(32))
    channels.set(
      channelId!,
      new ChannelState(
        channelId!,
        0,
        stringToUint8Array('0x0000000000000000000000000000000000000000'),
        new Allocation(
          [new Uint8Array()],
          new Balances([new Balance([stringToUint8Array(amount!.toString())]), new Balance([new Uint8Array()])]),
          []
        ),
        new Uint8Array(),
        false
      )
    )
    setAmount(undefined)
    setChallengeDuration(undefined)
    setPeerAddress('')
  }
  const handleUpdateChannel = (channelId: Uint8Array, uA: bigint) => {
    /* serviceClient.updateChannel(channelId, 0, uA).then((resp: { rejected?: any; update?: any }) => {
      if (resp.rejected) {
        // Handle the rejection case
        const reason = resp.rejected.reason || 'Unknown reason'
        handleRejected(reason)
      } else {
        const { update } = resp
        channels.set(update.channelId, update.state)
      }
    }) */
    // remove following code once wallet-wrapper is integrated.
    const updatedState = channels.get(channelId)
    updatedState!.version += 1
    updatedState!.allocation!.balances!.balances[0] = new Balance([stringToUint8Array(uA.toString())])
    channels.set(channelId, updatedState!)
  }

  const handleCloseChannel = (channelId: Uint8Array) => {
    /* serviceClient.closeChannel(channelId).then((resp: { rejected?: any; close?: any }) => {
      if (resp.rejected) {
        // Handle the rejection case
        const reason = resp.rejected.reason || 'Unknown reason'
        handleRejected(reason)
      } else {
        const { close } = resp
        channels.delete(close.channelId)
      }
    }) */
    // remove following code once wallet-wrapper is integrated.
    channels.delete(channelId)
  }

  const genesisBlockHash = useMemo(() => networks.find(v => v.id === networkID)?.genesisHash, [networkID, networks])
  hooks.useInitData({
    clearGeneratedTx,
    dispatch,
    wallet,
    setGenesisBlockTimestamp,
    genesisBlockHash,
  })
  hooks.useUpdateGlobalAPC({ bestKnownBlockTimestamp, genesisBlockTimestamp, setGlobalAPC })

  const syncStatus = getSyncStatus({
    bestKnownBlockNumber,
    bestKnownBlockTimestamp,
    cacheTipBlockNumber,
    currentTimestamp: Date.now(),
    url: getCurrentUrl(networkID, networks),
  })

  const free = BigInt(wallet.balance)
  const locked = records
    .filter(record => !(record.unlockInfo && record.status === 'dead'))
    .reduce((acc, record) => {
      const key = record.depositOutPoint
        ? `${record.depositOutPoint.txHash}-${record.depositOutPoint.index}`
        : `${record.outPoint.txHash}-${record.outPoint.index}`

      return acc + BigInt(withdrawList.get(key) || 0)
    }, BigInt(0))

  const onlineAndSynced = ConnectionStatus.Online === connectionStatus && SyncStatus.SyncCompleted === syncStatus

  const isEnglish = language === 'en' || language.startsWith('en-')

  return (
    <PageContainer
      head={
        <div className={styles.pageHead}>
          Nervos DAO
          {isPrivacyMode ? (
            <EyesClose onClick={() => setIsPrivacyMode(false)} />
          ) : (
            <EyesOpen onClick={() => setIsPrivacyMode(true)} />
          )}
        </div>
      }
    >
      <div className={styles.header}>
        <div className={styles.daoContainer}>
          <div className={styles.daoOverview}>
            <div className={clsx(styles.field, styles.free)}>
              <div className={styles.name}>{t(`nervos-dao.free`)}</div>
              <div className={styles.value}>
                {isPrivacyMode ? (
                  <>
                    <span className={styles.number}>{HIDE_BALANCE}</span> CKB
                  </>
                ) : (
                  <CopyZone
                    content={shannonToCKBFormatter(`${free}`, false, '')}
                    name={t('nervos-dao.copy-balance')}
                    className={styles.balance}
                  >
                    <span className={styles.number}>{shannonToCKBFormatter(`${free}`)}</span> CKB
                  </CopyZone>
                )}
              </div>
            </div>

            <div className={clsx(styles.field, styles.locked)}>
              <div className={styles.name}>{t(`nervos-dao.locked`)}</div>
              <div className={styles.value}>
                {onlineAndSynced && !isPrivacyMode ? (
                  <CopyZone
                    content={shannonToCKBFormatter(`${locked}`, false, '')}
                    name={t('nervos-dao.copy-balance')}
                    className={styles.balance}
                  >
                    <span className={styles.number}>
                      {isPrivacyMode ? HIDE_BALANCE : shannonToCKBFormatter(`${locked}`)}
                    </span>{' '}
                    CKB
                  </CopyZone>
                ) : (
                  <div>
                    <span className={styles.number}>{!onlineAndSynced ? '--' : HIDE_BALANCE}</span> CKB
                  </div>
                )}
              </div>
            </div>

            <div className={clsx(styles.field, styles.apc)}>
              <div className={styles.name}>
                {t(`nervos-dao.apc`)}
                {isEnglish && (
                  <span className={styles.tooltip} data-tooltip={t(`nervos-dao.apc-tooltip`)}>
                    <Attention />
                  </span>
                )}
              </div>
              <div className={styles.value}>
                {isPrivacyMode ? (
                  <span className={styles.number}>******</span>
                ) : (
                  <>
                    ≈ <span className={styles.number}>{globalAPC}%</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={styles.openChannel}>
            <Form>
              <div className={styles.formContainer}>
                <Form.Group className={styles.formGroup} controlId="amount">
                  <Form.Label className={styles.formLabel}>{t(`perun.insert-amount`)}:</Form.Label>
                  <Form.Control
                    type="number"
                    value={amount || ''}
                    onChange={(event: { currentTarget: { value: string } }) => {
                      handleAmountChange(event.currentTarget.value)
                    }}
                  />
                  <Form.Text className={styles.formText}>CKB</Form.Text>
                </Form.Group>
                <Form.Group className={styles.formGroup} controlId="peerAddress">
                  <Form.Label className={styles.formLabel}>{t(`perun.peer-address`)} :</Form.Label>
                  <Form.Control
                    type="text"
                    value={peerAddress || ''}
                    onChange={(event: { currentTarget: { value: string } }) => {
                      handlePeerAddressChange(event.currentTarget.value)
                    }}
                  />
                </Form.Group>
                <Form.Group className={styles.formGroup} controlId="challengeDuration">
                  <Form.Label className={styles.formLabel}>{t(`perun.challenge-duration`)} :</Form.Label>
                  <Form.Control
                    type="number"
                    value={challengeDuration || ''}
                    onChange={(event: { currentTarget: { value: string } }) => {
                      handleChallengeDurationChange(event.currentTarget.value)
                    }}
                  />
                </Form.Group>
              </div>
            </Form>
            <button
              className={styles.openButton}
              onClick={() => handleOpenChannel()}
              type="button"
              disabled={!validInputs}
            >
              {t(`perun.open-channel`)}
            </button>
          </div>
        </div>

        <div className={`${styles['channel-entry']} ${styles.channels}`}>
          <div className={`${styles.header}`} color="white">
            {t(`perun.channels`)} :{' '}
          </div>
          {channels.size === 0 && <div>{t(`perun.no-open`)} </div>}
          {Array.from(channels).map(channel => (
            <Container className={`${styles['channel-entry']}`}>
              <div className={`${styles['channel-info']}`}>
                <div className={styles['channel-id']}>{`0x${channel[1].id.toString()}`}</div>
                <Button
                  className={`${styles['info-button']}`}
                  variant="light"
                  size="sm"
                  onClick={() => setShowState(channels.get(channel[1].id))}
                >
                  <BiPlus />
                </Button>
              </div>
              <div className={styles['channel-buttons']}>
                <button
                  className={`${styles['channel-button']} ${styles['channel-update-button']}`}
                  type="button"
                  onClick={() => {
                    setChannelID(channel[1].id)
                    setUpdateChannelDialog(true)
                  }}
                >
                  {t(`perun.update-channel`)}
                </button>
                <button
                  className={`${styles['channel-button']} ${styles['channel-close-button']}`}
                  type="button"
                  onClick={() => handleCloseChannel(channel[0])}
                >
                  {t(`perun.close-channel`)}
                </button>
              </div>
            </Container>
          ))}
        </div>
        <Modal show={showRejectionModal} onHide={() => handleCloseRejectionModal()}>
          <Modal.Header closeButton>
            <Modal.Title>{t(`perun.rejection-reason`)} :</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>rejected</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => handleCloseRejectionModal()}>
              {t(`perun.ok`)}!
            </Button>
          </Modal.Footer>
        </Modal>
        {updateChannelDialog && channelID !== undefined && (
          <div className={styles.dialogContainer}>
            <Button
              className={`${styles.closeButton}`}
              variant="light"
              size="sm"
              onClick={() => {
                setUpdateChannelDialog(false)
                setChannelID(undefined)
              }}
            >
              <BiX />
            </Button>
            <p>{t(`perun.enter-amount`)}</p>
            <Form.Group className={styles.formGroup} controlId="amount">
              <Form.Label className={styles.formLabel}>Amount:</Form.Label>
              <Form.Control
                type="number"
                value={updateAmount || ''}
                onChange={(event: { currentTarget: { value: string } }) => {
                  handleUpdateAmountChange(event.currentTarget.value)
                }}
              />
              <Form.Text className={styles.formText}>CKB</Form.Text>
            </Form.Group>
            <Button
              className={styles.updateButton}
              onClick={() => {
                setUpdateChannelDialog(false)
                handleUpdateChannel(channelID, BigInt(updateAmount! * 1e18))
                setChannelID(undefined)
              }}
            >
              {t(`perun.update-channel`)}
            </Button>
          </div>
        )}
        {showInfo && showState !== undefined && (
          <div className={styles.dialogContainer}>
            <Button
              className={`${styles.closeButton}`}
              variant="light"
              size="sm"
              onClick={() => {
                setShowInfo(false)
                setShowState(undefined)
              }}
            >
              <BiX />
            </Button>
            <p>{t(`perun.state`)}:</p>
            <p>{JSON.stringify(showState)}</p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

Perun.displayName = 'Perun'

export default Perun

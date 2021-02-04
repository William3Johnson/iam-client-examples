import React, { useState } from 'react'
import './App.css'
import './Login.css'
import { IAM, CacheServerClient } from 'iam-client-lib'
import axios from 'axios'
import logo from './assets/logo.svg'
import metamaskLogo from './assets/metamask-logo.svg'
import { config } from './config'
import walletconnectIcon from './assets/wallet-connect-icon.svg'
import Spinner from './components/Spinner'
import SourceCode from './components/SourceCode'

const cacheClient = new CacheServerClient({
  url: 'https://volta-identitycache.energyweb.org/',
})

const iam = new IAM({
  rpcUrl: 'https://volta-rpc.energyweb.org',
  chainId: 73799,
  cacheClient,
})

type Role = {
  name: string
  namespace: string
}

function App() {
  const [roles, setRoles] = useState<Role[]>([])
  const [did, setDID] = useState<string>('')
  const [errored, setErrored] = useState<Boolean>(false)
  const [loading, setLoading] = useState<Boolean>(false)
  const [unauthorized, setUnauthorized] = useState<Boolean>(false);

  const verifyIdentity = async function () {
    const claim = await iam.createIdentityProof()
    const { data } = await axios.post<{ token: string }>(
      `${config.backendUrl}/login`,
      {
        claim,
      }
    )
    const requestConfig = {
      headers: { Authorization: `Bearer ${data.token}` },
    }
    const { data: roles } = await axios.get<Role[]>(
      `${config.backendUrl}/roles`,
      requestConfig
    )
    setRoles(roles)
  }

  const login = async function (initOptions?: {
    useMetamaskExtension: boolean
  }) {
    setLoading(true)
    setErrored(false)
    setUnauthorized(false)
    try {
      const { did } = await iam.initializeConnection(initOptions)
      if (did) {
        setDID(did)
        await verifyIdentity()
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setUnauthorized(true);
      }
      setErrored(true)
    }
    setLoading(false)
  }

  const logout = function () {
    setDID('')
  }

  const loadingMessage = (
    <div>
      <Spinner />
      <span>Loading... (Please sign messages using your connected wallet)</span>
    </div>
  )
  
  const enrolmentButton = config.enrolmentUrl && (
        <a href={`${config.enrolmentUrl}&returnUrl=${encodeURIComponent(window.location.href)}`} className="button">
          <span>Enrol to test role</span>
        </a>
      )

  const loginResults = (
    <div>
      <p>Hello user!</p>
      <p>
        Your decentralised identifier: <br />
        <strong>{did}</strong>
      </p>
      {roles && roles.length > 0 ? (
        <div className="rolesContainer">
          <p>These are your validated roles:</p>
          {roles.map(({ name, namespace }) => (
            <p key={namespace}>
              <strong>{`${name}`}</strong>
              {` at ${namespace}`}
            </p>
          ))}
        </div>
      ) : (
        <div>
          You do not have any issued role at the moment, please login into
          switchboard and search for apps, orgs to enrol.
        </div>
      )}
      <div className="logoutContainer">
        {enrolmentButton}
        <button onClick={logout} className="button">
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  const loginOptions = (
    <div className="container">
      <button
        className="button"
        onClick={async () => await login({ useMetamaskExtension: false })}
      >
        <img
          alt="walletconnect logo"
          className="walletconnect"
          src={walletconnectIcon}
        />
        <span>Login with Wallet Connect</span>
      </button>
      <button
        className="button"
        onClick={async () => await login({ useMetamaskExtension: true })}
      >
        <img alt="metamask logo" className="metamask" src={metamaskLogo} />
        <span>Login with Metamask</span>
      </button>
    </div>
  )

  const errorMessage = (
    <div>
      <p>
        Error occured with login.
        <br />
        If you rejected the signing requests, please try again and accept.
        <br />
        If this is your first time logging in, your account needs a small amount
        of Volta token to create a DID Document.
        <br />A Volta token can be obtained from the{' '}
        <a href="https://voltafaucet.energyweb.org/">Volta Faucet</a>.
      </p>
      {loginOptions}
    </div>
  )

  const unauthorizedMessage = (
    <div>
      <p>
        Unauthorized login response.
        <br />
        Please ensure that you have the necessary role claim.
      </p>
      <div className="enrolbuttonContainer">
        {config.enrolmentUrl && (
          <p>
            Use enrolment button to request necessary role.
          </p>
        )}
        {enrolmentButton}
      </div>
      {loginOptions}
    </div>
  );

  const loginJsx = () => {
    if (loading) {
      return loadingMessage
    }
    if (unauthorized) {
      return unauthorizedMessage
    }
    if (errored) {
      return errorMessage
    }
    if (did) {
      return loginResults
    }
    return loginOptions
  }

  return (
    <div className="App">
      <img src={logo} className="App-logo" alt="logo" />
      <h2>IAM showcase app</h2>
      {loginJsx()}
      <SourceCode />
    </div>
  )
}

export default App

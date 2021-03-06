const axios = require("axios");
const querystring = require("querystring");
const jwt = require("jsonwebtoken");
const env = require("../.env");
const oauth = env.oauth;

const redirectUri = `${env.backURL}/oauth/callback`;

const getURI = (redirectUri,state) => {
    return `${oauth.authorizationURI}/?redirect_uri=${redirectUri}&client_id=${oauth.clientId}&response_type=code&state=${state}&scope=default`;
};

const getToken = (redirectUri,code,state) => {
    return axios.post(
        oauth.accesTokenURI,
        querystring.stringify({
            grant_type: "authorization_code",
            code:code,
            redirect_uri: redirectUri,
            client_id:oauth.clientId,
            client_secret: oauth.clientSecret,
            state: state,
        })
    );
};

const getUser = (token) =>{
    return axios.get(
        oauth.getUser, {
            headers:{
                Authorization: `Bearer ${token}`
            }
        }
    );
};

const login = (req, res) => {
    req.session.state = Math.random().toString(36);
    res.redirect(getURI(redirectUri, req.session.state));
};

const oauthCallback = (req,res) => {
    getToken(redirectUri,req.query.code, req.session.state)
        .then(response => {
            const accessToken = response.data.access_token;
            getUser(accessToken)
                .then(getUserRes => {
                    const {data} = getUserRes;
                    if (env.admin.indexOf(data.login)>=0) {
                        const token = jwt.sign({
                            login: data.login,
                            fullName: `${data.firstName} ${data.lastName}`
                        }, env.tokenSecret);

                        res.redirect(`${env.frontURL}/login/${token}`);
                    } else {
                        res.status(400).end("Vous n'avez pas la permission");
                    }
                })
                .catch(err => res.status(500).end("Impossible de récupérer les informations\n"+err));
        })
        .catch(err => res.status(500).end("Impossible de récupérer les informations\n"+err));
};

module.exports = {login, oauthCallback};

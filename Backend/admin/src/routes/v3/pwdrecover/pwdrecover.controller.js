const sgMail = require('@sendgrid/mail');

const PwdRecoverValidation = require('./pwdrecover.validation');
const PwdRocoverModel = require('./pwdrecover.model');
const Password = require('./password.service');
const email_tepmlate = require('./email.template');
const sendResponse = require('../../../utils/myService').sendResponse;
const Logger = require('../../../logger/Logger').logger;
const actionsTracker = require('../services/actionsTracker');
const { pwdRecoveryMessages } = require("../../../utils/helpers/LanguageTranslate");
const { forgotPasswordMessages, roleUpateMailMessage } = require('../../../utils/helpers/LanguageTranslate');
const PasswordEncodeDecoder = require('../../../utils/helpers/PasswordEncoderDecoder');

class PwdRecoverController {

    /**Forgot password*/
    async forgotPassword(req, res) {

        let logo, facebook, copyright_year, twitter,
            skype_email, brand_name, support_mail,
            reseller, admin_email, facebookHide, footerHide, twitterHide;

        let email = req.body.email.toLowerCase();
        let isClient = req.body.isClient;
        let validate = PwdRecoverValidation.forgotPassword(email, isClient);
        if (validate.error) return sendResponse(res, 404, null, "Validation failed", validate.error.details[0].message)

        try {
            let data = null;
            if(isClient && isClient != 'false') {
                data = await PwdRocoverModel.getClient(email);
            } else {
                data = await PwdRocoverModel.getUser(email);
                if (data.length != 0 && process.env.BLOCKING_FORGOT_PASSWORD_ORG_ID.split(",").includes(String(data[0]?.organization_id))) {
                    return sendResponse(res, 400, null, "Forgot password is disabled. Please contact your IT Team.", null);
                }
            }
            if (data.length === 0) return sendResponse(res, 400, null, "Not Registered.", null);
            // un-comment the line to make stop employee to change there password
            // if (data[0].name === 'Employee') return sendResponse(res, 400, null, "Don't have permission to update password..", null);

            const messageList = forgotPasswordMessages[data[0].language || "en"];

            if (data[0].logo || data[0].logo !== null) {
                reseller = JSON.parse(data[0].details);
            }
            logo = reseller ? (reseller.logo || process.env.EMPLOGO) : process.env.EMPLOGO
            facebook = reseller ? (getResellerData(reseller, "facebook") || null) : process.env.FACEBOOK;
            copyright_year = reseller ? (reseller.copyright_year || process.env.COPYRIGHT_YEAR) : process.env.COPYRIGHT_YEAR
            twitter = reseller ? (getResellerData(reseller, "twitter") || null) : process.env.TWITTER;
            skype_email = reseller ? (getResellerData(reseller, "skype_email") || null) : process.env.SKYPE_EMAIL;
            brand_name = reseller ? (reseller.brand_name || process.env.BRAND_NAME) : process.env.BRAND_NAME;
            support_mail = reseller ? (getResellerData(reseller, "support_mail") || null) : process.env.SUPPORT_EMAIL;
            admin_email = reseller ? (reseller.admin_email || process.env.EMP_ADMIN_EMAIL) : process.env.EMP_ADMIN_EMAIL
            let supportText = roleUpateMailMessage[data[0].language || "en"].Support;
            supportText = supportText || "Support";
            let user_id = data[0].id.toString();
            let ecrypt_data = await Password.encrypt(user_id, process.env.CRYPTO_PASSWORD);
            const base = process.env.NODE_ENV === 'production' ? process.env.WEB_PRODUCTION : process.env.WEB_DEV;
            let link = `${base}/reset?token=${encodeURIComponent(ecrypt_data)}&email=${encodeURIComponent(email)}`;
            link = reseller ? `${reseller.domain}/reset?token=${encodeURIComponent(ecrypt_data)}&email=${encodeURIComponent(email)}` : link;
            
            if(isClient) {
                link = `${link}&isClient=${isClient}`;
            }

            facebookHide = facebook ? "" : "hidden";
            twitterHide = twitter ? "" : "hidden";
            footerHide = twitter || facebook ? "" : "hidden"

            let emailtepmlate = email_tepmlate({
                twitterHide, facebookHide, footerHide,
                redirectlink: link, supportText,
                skype_email, twitter, logo, copyright_year
                , brand_name, support_mail, skype_email, admin_email, facebook,
                ...messageList
            })
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: admin_email,
                subject: messageList.subject_reseller.replace("{{BRAND_NAME}}", brand_name),
                text: messageList.subject_reseller.replace("{{BRAND_NAME}}", brand_name),
                html: emailtepmlate,
            };

            actionsTracker(req, 'Forgot password email sent to ?', [email]);
            sgMail.send(msg).then(data => {
                return sendResponse(res, 200, email, "Email Sent To User Email Address", null);
            }).catch(error => {
                return sendResponse(res, 400, null, "Unable to send mail", error);
            });
        } catch (err) {
            console.log(err);
            Logger.error(`-V3---error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, "Unable to send mail", err);
        }

    }


    async restPassword(req, res) {
        let new_password = req.body.new_password;
        let confirm_password = req.body.confirm_password;
        let email = req.body.email.toLowerCase();
        let token = req.body.token;
        let isClient = req.body.isClient;

        let validate = PwdRecoverValidation.UpdatePassword(email, new_password, confirm_password, token, isClient);
        if (validate.error) return sendResponse(res, 404, null, "Validation failed.", validate.error.details[0].message);

        if (new_password !== confirm_password) return sendResponse(res, 400, null, "Password Is Not Matching.", null);
        try {
            let decrypt_data = await Password.decrypt(token, process.env.CRYPTO_PASSWORD);

            let data = null;
            if(isClient && isClient != 'false') {
                data = await PwdRocoverModel.getClient(email);
            } else {
                data = await PwdRocoverModel.getUser(email);
            }
            
            if (!data || data.length == 0) return sendResponse(res, 400, null, "Unable Updaet Password.", null);
            if (data[0].id !== parseInt(decrypt_data)) return sendResponse(res, 400, null, "Invalid Email.", null);

            let password = await Password.encrypt(new_password, process.env.CRYPTO_PASSWORD);

            let updated = await PwdRocoverModel.updateProfileData(data[0].id, password)
            if (updated.affectedRows == 0) return sendResponse(res, 400, null, "Unable Updaet Password.", null);

            actionsTracker(req, 'User %i password update successfully.', [data[0].id]);
            return sendResponse(res, 200, null, "Password Update Successfully.", null);
        } catch (err) {
            Logger.error(`-V3---error-----${err}------${__filename}----`);
            return sendResponse(res, 400, null, "Unable Updaet Password.", "Unable Updaet Password.");
        }
    }

    /**
     * adminResetPassword
     * @description function to use for reseting amember password
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async adminResetPassword(req, res) {
        let email = req.body.email.toLowerCase();
        
        let logo, facebook, copyright_year, twitter,
            skype_email, brand_name, support_mail,
            reseller, admin_email, facebookHide, footerHide, twitterHide;

        /** validation for the emaila */
        let validate = PwdRecoverValidation.adminResetPassword(email);
        if (validate.error) return sendResponse(res, 404, null, "Validation failed.", validate.error.details[0].message);
        
        /** get amember detailsv */
        let [amemberDetails] = await PwdRocoverModel.getAmemberDetails(email);

        /** amember details validation */
        if(!amemberDetails || (amemberDetails && !amemberDetails.amember_id )) {
            return sendResponse(res, 400, null, "invalid email.", null);
        }

        /** gettting reseller details */
        const [ resellerDetails ] =  await PwdRocoverModel.getResellerDetails(amemberDetails.organization_id);
     
        const messageList = forgotPasswordMessages[amemberDetails.language || "en"];
        
        /** reseller or own branch changes for email template */
        if(resellerDetails) {
            reseller = JSON.parse(resellerDetails.details);
        }
        logo = reseller ? (reseller.logo || process.env.EMPLOGO) : process.env.EMPLOGO
        facebook = reseller ? (getResellerData(reseller, "facebook") || null) : process.env.FACEBOOK;
        copyright_year = reseller ? (reseller.copyright_year || process.env.COPYRIGHT_YEAR) : process.env.COPYRIGHT_YEAR
        twitter = reseller ? (getResellerData(reseller, "twitter") || null) : process.env.TWITTER;
        skype_email = reseller ? (getResellerData(reseller, "skype_email") || null) : process.env.SKYPE_EMAIL;
        brand_name = reseller ? (reseller.brand_name || process.env.BRAND_NAME) : process.env.BRAND_NAME;
        support_mail = reseller ? (getResellerData(reseller, "support_mail") || null) : process.env.SUPPORT_EMAIL;
        admin_email = reseller ? (reseller.admin_email || process.env.EMP_ADMIN_EMAIL) : process.env.EMP_ADMIN_EMAIL

        let supportText = roleUpateMailMessage[amemberDetails.language || "en"].Support;
        supportText = supportText || "Support";

        /** encrypted amember id and password reset link */
        let ecrypt_data = await PasswordEncodeDecoder.passwordEncrypt(amemberDetails.amember_id.toString());
        let link = process.env.WEB_DEV + `/verify-admin-password?id=${ecrypt_data}`;
        if (process.env.NODE_ENV === 'development') {
            link = process.env.WEB_DEV + `/verify-admin-password?id=${ecrypt_data}`;
        } else if (process.env.NODE_ENV === 'production') {
            link = process.env.WEB_PRODUCTION + `/verify-admin-password?id=${ecrypt_data}`;
        }
        link = reseller ? reseller.domain + `/verify-admin-password?id=${ecrypt_data}` : link;
        
        facebookHide = facebook ? "" : "hidden";
        twitterHide = twitter ? "" : "hidden";
        footerHide = twitter || facebook ? "" : "hidden"

        let emailtepmlate = email_tepmlate({
            twitterHide, facebookHide, footerHide,
            redirectlink: link, supportText,
            skype_email, twitter, logo, copyright_year
            , brand_name, support_mail, skype_email, admin_email, facebook,
            ...messageList
        })

        /** send grid mail config */
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: email,
            from: admin_email,
            subject: "Password Reset For "+ brand_name,
            text: "Password Reset For "+ brand_name,
            html: emailtepmlate,
        };

        actionsTracker(req, 'admin reset password email sent to ?', [email]);
        sgMail.send(msg).then(data => {
            return sendResponse(res, 200, email, "Reset password link sent to email, please check the mail", null);
        }).catch(error => {
            return sendResponse(res, 400, null, "Unable to send mail", error);
        });
    }
}
module.exports = new PwdRecoverController;

/**
 * getResellerData
 * @description function to get the Reseller data
 * @param {*} resellerDataObj 
 * @param {*} nodeName 
 */
 function getResellerData(resellerDataObj, nodeName) {
    if(
        resellerDataObj &&
        resellerDataObj[nodeName] &&
        resellerDataObj[nodeName].length &&
        resellerDataObj[nodeName] != 'null'

    ) {
        return resellerDataObj[nodeName];
    }
    return null;
}

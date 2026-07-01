const sendResponse = require('../../../utils/myService').sendResponse;
const BiometricModel = require('./biometric.model');
const jwt = require('jsonwebtoken')
const moment = require('moment')
const PasswordEncoderDecoder = require('../../../utils/helpers/PasswordEncoderDecoder');
const BiometricValidator = require('./biometric.validation.js')
const redis = require("../auth/services/redis.service");
const email_tepmlate = require('./email.template');
const sgMail = require('@sendgrid/mail');
const { forgotPasswordMessages, roleUpateMailMessage } = require('../../../utils/helpers/LanguageTranslate');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({ keyFilename: 'storageconfig.json' });
const bucketName = process.env.BUCKET_NAME_BIOMETRICS;
const bucket = storage.bucket(bucketName);

const {QRCodeCanvas} = require('@loskir/styled-qr-code-node');
const qrOptions = require('./qrOption.json');

class DepartmentController {

    async enableBiometric(req, res) {
        const { organization_id, email, user_id } = req.decoded;
        const { secretKey, userName, status } = req.body;
        const { value,error } = BiometricValidator.enableBiometric(req?.body);
        if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
       
        try {
            const user = await BiometricModel.checkStatus(user_id);
            if (user[0].email !== email) return sendResponse(res, 400, null, 'Invalid email', null);
            if (status == 1) {
                if (user[0].is_bio_enabled === 'true') return sendResponse(res, 400, null, 'Biometric already enabled', null);

                const encryptedKey = await PasswordEncoderDecoder.encryptText(secretKey, process.env.CRYPTO_PASSWORD);
                const resultData = await BiometricModel.enableBiometric(user_id, encryptedKey, userName);
                if (resultData) {
                    if (resultData.affectedRows > 0) {
                        user[0].is_bio_enabled = 'true';
                        if(userName) user[0].username = userName;
                        return sendResponse(res, 200, user[0], 'Biometric enabled succesfully', null);
                    } else {
                        return sendResponse(res, 400, null, 'Error enabling biometric', null);
                    }
                } else {
                    return sendResponse(res, 400, null, 'Something went wrong', null);
                }
            } else {
                if (user[0].is_bio_enabled === 'false') return sendResponse(res, 400, null, 'Biometric already disabled', null);
                const resultData = await BiometricModel.disableBiometric(user_id, userName);
                if (resultData) {
                    if (resultData.affectedRows > 0) {
                        user[0].is_bio_enabled = 'false';
                        if (userName) user[0].username = userName;
                        return sendResponse(res, 200, user[0], 'Biometric disabled succesfully', null);
                    } else {
                        return sendResponse(res, 400, null, 'Error disabling biometric', null);
                    }
                }
            }
        } catch (err) {
            return sendResponse(res, 400, null, 'Something went wrong', err);
        }

    }
    
    async checkStatus(req, res) {
        const { organization_id, user_id } = req.decoded;
        try {
            const user = await BiometricModel.checkStatus(user_id);             
            return sendResponse(res, 200, {status: user[0].is_bio_enabled}, 'Biometric status ', null);                        
        } catch (err) {
            return sendResponse(res, 400, null, 'Something went wrong', err);
        }

    }

    async setPassword(req, res) {
        const { organization_id, email, user_id } = req.decoded;
        const { secretKey } = req?.body;
        try {
            const encryptedKey = await PasswordEncoderDecoder.encryptText(secretKey, process.env.CRYPTO_PASSWORD);
            let updateKey = await BiometricModel.updateSecretKey(email, encryptedKey);   
            return sendResponse(res, 200, null, "Biometric Password Updated.", null);                   
        } catch (err) {
            return sendResponse(res, 400, null, 'Something went wrong', err);
        }
    }

    async auth(req, res) {
        const { userName, email, secretKey } = req?.body;
        let accessToken;
        const { value, error } = BiometricValidator.fetchUserData(req?.body);
        if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
        const userData = await BiometricModel.fetchUserData(email, userName)
        if (!userData.length) return sendResponse(res, 400, null, 'Invalid email or username', null);
        if(userData[0]?.is_bio_enabled === 'false') return sendResponse(res, 400, null, 'Biometric authentication disabled. Enable from dashboard.', null);
        let decryptedKey = await PasswordEncoderDecoder.decryptText(userData[0]?.secret_key, process.env.CRYPTO_PASSWORD);

        if (secretKey == decryptedKey && userData[0].username == userName || secretKey == decryptedKey && userData[0].email == email) {
            let [camera_overlay_status] = await BiometricModel.getCameraOverlayStatus(userData[0].organization_id);
            let [departmentCount] = await BiometricModel.getDepartmentStatus(userData[0].organization_id);
            accessToken = jwt.sign({ userData: userData[0] }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: process.env.BIOMETRIC_EXPIRY });
            let isDepartment = departmentCount ? departmentCount.count > 0 ? 1 : 0 : 0
            return sendResponse(res, 200, { userData, accessToken, camera_overlay_status: camera_overlay_status.camera_overlay_status, department_status: isDepartment }, 'log in success', null);
        } else {
            return sendResponse(res, 400, null, 'Invalid SecretKey', null);
        }
    } catch(err) {
        return sendResponse(res, 400, null, 'Something went wrong', err);
    }

    async fetchUser(req, res) {

        try {
            let timeString = moment().utc().toISOString();
            const {organization_id } = req.decoded.userData;
            const skip = req?.query?.skip || '0'; 
            const limit = req?.query?.limit  || '10';
            const {search,sortOrder,sortColumn,location_id,user_id, department_id, count } = req?.query;

            let [confirmationStatus] = await BiometricModel.getConfirmationStatus(organization_id);
            if(!confirmationStatus)  return sendResponse(res, 400, null, 'Organization not found', null);

            if(user_id) {
                let resultData = await BiometricModel.findUserDetails(organization_id,location_id,user_id)
                if (!resultData.length) return sendResponse(res, 400, null, 'No users found with provided user_id', null);

                const attendanceDate = moment();
                await updateCountersOnMatch({ date: attendanceDate.format('YYYY-MM-DD'), organization_id, count, department_id });
                if(department_id) {
                    let employeeDetails = await BiometricModel.getEmployeeData(user_id)
                    const employee_id =employeeDetails[0]?.employee_id;
                    if(!employee_id) return sendResponse(res, 200, { userData:resultData, confirmationStatus: confirmationStatus.biometrics_confirmation_status }, 'Biometric details fetched successfully', null);
                    const [attendanceObj] = await BiometricModel.getHrmsEmployeeAttendance({ employee_id, organization_id, date: attendanceDate.format('YYYY-MM-DD') });
                    await addLogsDepartment({ employee_id, department_id, date: attendanceDate.format('YYYY-MM-DD'), isoString: timeString, organization_id: organization_id})
                    return sendResponse(res, 200, { userData:resultData, confirmationStatus: confirmationStatus.biometrics_confirmation_status }, 'Biometric details fetched successfully', null);
                }

                return sendResponse(res, 200, { userData:resultData, confirmationStatus: confirmationStatus.biometrics_confirmation_status }, 'Biometric details fetched successfully', null);
            }
            const usersData = await BiometricModel.fetchUsers(organization_id,location_id,search, sortColumn, sortOrder, skip,limit)
            if (!usersData.length) return sendResponse(res, 400, null, 'No users found', null);
            const usersCount = await BiometricModel.getUsers(organization_id,location_id)
            return sendResponse(res, 200, { count:usersCount[0]?.total,usersData, confirmationStatus: confirmationStatus.biometrics_confirmation_status }, 'Biometric details fetched successfully', null);

        } catch (err) {
            console.log(err)
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }

    async updateUser(req, res) {

        try {
            let faceURL;
            const { organization_id, email } = req.decoded.userData;
            const { user_id, finger1, finger2, face, bio_code } = req?.body;
            const { value,error } = BiometricValidator.updateBiometricData(req?.body);
            if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
            let [isSuspend] = await BiometricModel.checkStatus(user_id);
            if(isSuspend.status === 2)  return sendResponse(res, 200, null, 'Can not register face for suspended user', null);
            const [userData] = await BiometricModel.checkBiometricStatus(user_id);
            const biometricData = await BiometricModel.getBiometricData(user_id);


            if(req.files){
                let item = req.files[0];
                let folderName = `${email}`;
                let [firstName] = userData.first_name.split(' ')

                let prefix = `${folderName}/${firstName}_face_${biometricData.user_id}.jpg`;

                // Delete files with the specified prefix
                async function deleteFiles(prefix) {
                    try {
                        const [files] = await bucket.getFiles({ prefix });
                        await Promise.all(files.map(file => file.delete()));
                    } catch (err) {
                        throw err;
                    }
                }
                await deleteFiles(prefix);

                faceURL = await uploadImage(item, folderName);
            }
            if(bio_code){
                let bioCodeExists = await BiometricModel.checkBioCode(bio_code,user_id);
                if(bioCodeExists.length > 0) return sendResponse(res, 400, null, 'This Bio Code already exists,Please enter a new bio code.')
            }
            let resultData;
            if (!biometricData.length) {
                resultData = await BiometricModel.insertUser(user_id, finger1, finger2, faceURL, bio_code, organization_id)
            }
            resultData = await BiometricModel.updateUser(user_id, finger1, finger2, faceURL, bio_code, organization_id)
            if (resultData?.affectedRows > 0) {
                return sendResponse(res, 200, null, 'Biometric data updated successfully', null);
            } else {
                return sendResponse(res, 400, null, 'Error updating biometric data', null);
            }

        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }

    async getUser(req, res) {

        try {
            const { organization_id,id,timezone } = req.decoded.userData;
            const { finger, face, bio_code } = req?.body;
            const { error } = BiometricValidator.fetchUserDetails(req?.body);
            if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
                let resultData,auth;
                switch (true) {
                    case finger != null && finger !== undefined:
                        resultData = await BiometricModel.getFingerDetails(finger);
                        auth = (resultData[0]?.finger1 == finger ? 'finger1' : 'finger2');
                        break;
                    case face != null && face !== undefined:
                        resultData = await BiometricModel.getFaceDetails(face);
                        auth = 'face';
                        break;
                    case bio_code != null && bio_code !== undefined:
                        resultData = await BiometricModel.getBioDetails(bio_code);
                        auth = 'bio_code';
                        break;
                }
                if(resultData?.length){  
                    let employeeDetails = await BiometricModel.getEmployeeData(resultData[0]?.user_id)
                    const attendanceDate = moment().format('YYYY-MM-DD');
                    const employee_id =employeeDetails[0]?.employee_id;
                    const [attendanceObj] = await BiometricModel.getHrmsEmployeeAttendance({ employee_id, organization_id, date: attendanceDate });
                    
                   
                    let punchInTime = new Date();
                    const startOrEndTime = moment(punchInTime).utc().format('YYYY-MM-DD HH:mm:ss');
                    let punchTimeMoment = moment(punchInTime);
                    
                    if (timezone) punchTimeMoment = punchTimeMoment.tz(timezone);
        
                    const bioStatus = await BiometricModel.checkBiometricStatus(id)
                    if (!bioStatus[0]?.is_bio_enabled) return sendResponse(res, 400, null, 'BioMetric not enabled', null);
                    let attendanceCreateOrUpdateStatus;
                    if (attendanceObj) {
                        let startTime = moment(attendanceObj.start_time);
                        let endTime = moment()
                        let durationInMinutes = endTime.diff(startTime, 'minutes');
                        if (durationInMinutes < 60) return sendResponse(res, 400, null, 'Can not checkout before 1 hr', null);
                        //update the attendance end_time
                        attendanceCreateOrUpdateStatus = await BiometricModel.updateHrmsAttendance({ id: attendanceObj.id, end_time: startOrEndTime });
        
                        return sendResponse(res, 200, { auth:auth, status:1 , time:punchTimeMoment.format('YYYY-MM-DD HH:mm:ss'), userData: employeeDetails}, "Successfully Checked Out", null)
                    } else {
                        // create the attendance
                        attendanceCreateOrUpdateStatus = await BiometricModel.createHrmsAttendance({
                            organization_id, employee_id, date: attendanceDate,
                            start_time: startOrEndTime,  is_manual_attendance: 2,
                        });
        
                        return sendResponse(res, 200, {auth:auth, status:0, time:punchTimeMoment.format('YYYY-MM-DD HH:mm:ss'), userData: employeeDetails}, "Successfully Checked In", null)
                    }
                }
                return sendResponse(res, 400, null, 'No data matched', null);
            

        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }

    async forgotSecretKey(req, res) {

        try {
            const { email, userName } = req?.body;
            const { error } = BiometricValidator.forgotSecretKey(req?.body);
            if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
            const adminData = await BiometricModel.fetchUserData(email,userName);

            if (!adminData.length) return sendResponse(res, 400, null, 'email does not exist', null);
            if (adminData[0].is_bio_enabled == 'false') return sendResponse(res, 400, null, 'Biometric feature is not enabled', null);
            if (adminData[0].secret_key == null) return sendResponse(res, 400, null, 'SecretKey has not been set.', null);
            
            let logo, facebook, copyright_year, twitter,
            skype_email, brand_name, support_mail,
            reseller, admin_email, facebookHide, footerHide, twitterHide;

            //getting reseller details
            const resellerDetails = await BiometricModel.getResellerDetails(email);
           
            const messageList = forgotPasswordMessages[ "en"];

            if (resellerDetails?.length) {
                reseller = JSON.parse(resellerDetails[0].details);
            }
            logo = reseller ? (reseller.logo || process.env.EMPLOGO) : process.env.EMPLOGO
            facebook = reseller ? (getResellerData(reseller, "facebook") || null) : process.env.FACEBOOK;
            copyright_year = reseller ? (reseller.copyright_year || process.env.COPYRIGHT_YEAR) : process.env.COPYRIGHT_YEAR
            twitter = reseller ? (getResellerData(reseller, "twitter") || null) : process.env.TWITTER;
            skype_email = reseller ? (getResellerData(reseller, "skype_email") || null) : process.env.SKYPE_EMAIL;
            brand_name = reseller ? (reseller.brand_name || process.env.BRAND_NAME) : process.env.BRAND_NAME;
            support_mail = reseller ? (getResellerData(reseller, "support_mail") || null) : process.env.SUPPORT_EMAIL;
            admin_email = reseller ? (reseller.admin_email || process.env.EMP_ADMIN_EMAIL) : process.env.EMP_ADMIN_EMAIL

            let supportText = roleUpateMailMessage["en"].Support;
            supportText = supportText || "Support";

            let otp = generateOTP();
            await redis.setAsync(`forgot_password_otp_biometric_${email}`, otp, "EX", 1800);

            facebookHide = facebook ? "" : "hidden";
            twitterHide = twitter ? "" : "hidden";
            footerHide = twitter || facebook ? "" : "hidden"

            let emailtepmlate = email_tepmlate({
                twitterHide, facebookHide, footerHide,
                isNewTemp: true,
                otp, supportText,
                skype_email, twitter, logo, copyright_year
                , brand_name, support_mail, skype_email, admin_email, facebook,
                ...messageList
            })

            /** send grid mail config */
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: admin_email,
                subject: "Biometric Password Reset For " + brand_name,
                text: "Biometric Password Reset For " + brand_name,
                html: emailtepmlate,
            };
            sgMail.send(msg).then(data => {
                return sendResponse(res, 200, email, "Reset password otp sent to email, please check the mail", null);
            }).catch(error => {
                return sendResponse(res, 400, null, "Unable to send mail", null);
            });

        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }
    async verifyKey(req, res) {

        try {
            const { email, otp, secretKey} = req?.body;
            if(!secretKey || !otp || !email) return sendResponse(res, 400, null, "email, secretKey or OTP is required", "email, secretKey or OTP is required");
             const adminData = await BiometricModel.fetchUserData(email);
    
             if (!adminData) return sendResponse(res, 400, null, 'email does not exist', null);
            
            let redisOtp = await redis.getAsync(`forgot_password_otp_biometric_${email}`);
            if(+redisOtp != +otp) return sendResponse(res, 400, null, "Invalid OTP", "Invalid OTP");
           
            const encryptedKey = await PasswordEncoderDecoder.encryptText(secretKey, process.env.CRYPTO_PASSWORD);
            let updateKey = await BiometricModel.updateSecretKey(email,encryptedKey);
            await redis.delAsync(`forgot_password_otp_biometric_${email}`);

            return sendResponse(res, 200, null, "Biometric Password Updated.", null);
        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }
    async getLocations(req, res) {

        try {
            const { organization_id } = req.decoded.userData;
    

            const locationData = await BiometricModel.getLocations(organization_id);

             if(!locationData.length) return sendResponse(res, 400, null, 'No locations found.') 

           
            return sendResponse(res, 200, locationData, 'Locations fetched successfully', null);
    

        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }
    async attendanceSummary(req, res) {

        try {
            const { organization_id } = req.decoded.userData;
            const { date,location_id} = req?.body;
            
            const { value,error } = BiometricValidator.attendanceSummary(req?.body);
            if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
            
            const location = await BiometricModel.checkLocations(location_id,organization_id)
           
            if(!location.length) return sendResponse(res, 400, null, 'No locations found with provided id.') 
            const yesterdayDate = moment(date).subtract(1,"d").format("YYYY-MM-DD")

            const usersCount = await BiometricModel.getUsers(organization_id,location_id)

            if(!usersCount[0]?.total) return sendResponse(res, 400, null, 'No users found');
            let attendanceHours = await BiometricModel.getAttendanceHours("attendance_hours", organization_id);

            if (attendanceHours.length > 0) {
                const value = JSON.parse(attendanceHours[0].value);
                attendanceHours = Number(value.values);
            }
            else attendanceHours = 28800;
            
            const [checkedIn] = await BiometricModel.getCheckedInUsers(date,location_id,organization_id);
            const [checkedOut] = await BiometricModel.getCheckedOutUsers(date,location_id,organization_id);
            const [suspend] = await BiometricModel.getSuspendUsers(location_id, organization_id)

            const currentDate = new Date();
            const formattedCurrentDate = currentDate.toISOString().split('T')[0]; 
            let absent;
            if (date < formattedCurrentDate) {
                absent = await BiometricModel.getAbsentUsersCustom(date, attendanceHours, location_id, organization_id)    
            }else {
                absent = await BiometricModel.getAbsentUsers(date, location_id,organization_id);
            }    

            const yesterDayPresent = await BiometricModel.getPresentUsers(yesterdayDate,attendanceHours,location_id,organization_id);
            const [yesterDayAbsent] = await BiometricModel.getAbsentUsersCustom(yesterdayDate, attendanceHours, location_id,organization_id);

            return sendResponse(res, 200, {date: date,totalUsers:usersCount[0]?.total,checkedIn: checkedIn?.checkIn,CheckedOut:checkedOut?.checkOut,absent:absent[0]?.absent,suspend : suspend?.suspend,yesterDayPresent:yesterDayPresent[0]?.present,yesterDayAbsent:yesterDayAbsent?.absent}, 'Attendance summary fetched successfully', null);
    

        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }
    async attendanceDetails(req, res) {

        try {
            const { organization_id, timezone } = req.decoded.userData;
            const { date,location_id,status} = req?.body;

            const skip = req?.query?.skip || '0';
            const limit = req?.query?.limit  || '10';
            const search = req?.query?.search;
            const sortOrder = req?.query?.sortOrder;
            const sortColumn = req?.query?.sortColumn;

            const { value,error } = BiometricValidator.attendanceDetails(req?.body);
            if (error) return sendResponse(res, 400, null, error?.details[0]?.message,'Validation Failed');
            
            const location = await BiometricModel.checkLocations(location_id,organization_id)
           
            if(!location.length) return sendResponse(res, 400, null, 'No locations found with provided id.') 
            const usersCount = await BiometricModel.getUsers(organization_id,location_id)
            let attendanceHours = await BiometricModel.getAttendanceHours("attendance_hours", organization_id);
            if (attendanceHours.length > 0) {
                const value = JSON.parse(attendanceHours[0].value);
                attendanceHours = Number(value.values);
            }
            else attendanceHours = 28800;
            const currentDate = new Date();
            const formattedCurrentDate = currentDate.toISOString().split('T')[0]; 

            let userData;
            if (date < formattedCurrentDate) {
               userData = await BiometricModel.fetchAttendanceCustom(date,location_id,attendanceHours,status,organization_id, search, sortColumn, sortOrder, skip,limit)

               const checkedIn = await BiometricModel.getCheckedInUsers(date,location_id,organization_id);

               const checkedOut = await BiometricModel.getCheckedOutUsers(date,location_id, organization_id)

               const absent = await BiometricModel.getAbsentUsersCustom(date, attendanceHours, location_id, organization_id)
               const [suspend] = await BiometricModel.getSuspendUsers(location_id, organization_id)

                 userData.map(u => {
                  u.checkIn = u.checkIn ?  moment(u.checkIn).tz(timezone).format("YYYY-MM-DD HH:mm:ss") : null;
                  u.checkOut = u.checkOut ? moment(u.checkOut).tz(timezone).format("YYYY-MM-DD HH:mm:ss") : null;
                })
                return sendResponse(res, 200, {totalUsers:usersCount[0]?.total, checkedIn: checkedIn[0]?.checkIn, CheckedOut:checkedOut[0]?.checkOut, Absent:absent[0]?.absent, suspend : suspend?.suspend, userData}, 'Attendance data fetched successfully', null);
            }

            userData = await BiometricModel.fetchAttendance(date,location_id,status,organization_id, search, sortColumn, sortOrder, skip,limit)
             
            const checkedIn = await BiometricModel.getCheckedInUsers(date,location_id,organization_id);

            const checkedOut = await BiometricModel.getCheckedOutUsers(date,location_id, organization_id)
            const absent = await BiometricModel.getAbsentUsers(date,location_id, organization_id)
            
            const [suspend] = await BiometricModel.getSuspendUsers(location_id, organization_id)
            
            userData.map(u => {
                u.checkIn = u.checkIn ?  moment(u.checkIn).tz(timezone).format("YYYY-MM-DD HH:mm:ss") : null;
                u.checkOut = u.checkOut ? moment(u.checkOut).tz(timezone).format("YYYY-MM-DD HH:mm:ss") : null;
            })

            return sendResponse(res, 200, {totalUsers:usersCount[0]?.total, checkedIn: checkedIn[0]?.checkIn, CheckedOut:checkedOut[0]?.checkOut, Absent:absent[0]?.absent, suspend : suspend?.suspend, userData}, 'Attendance data fetched successfully', null);
    

        } catch (err) {
            return sendResponse(res, 400, null, 'something went wrong', err);
        }

    }

    async getHolidays(req, res) {

        try {
            const { organization_id } = req.decoded.userData;
            const current_date=moment().format("YYYY-MM-DD");
            
            let holiday=await BiometricModel.fetchholidaysByYear(organization_id,current_date)
            holiday=holiday.sort((x,y) => x.holiday_date-y.holiday_date);
            
            return holiday.length ? sendResponse(res, 200, holiday, 'Holidays fetched successfully', null) : sendResponse(res, 400, null, "No holidays found", null);
             
        } catch (err) {
            return sendResponse(res, 400, null, 'Something went wrong', null);
        }

    }

    async fetchEmployeePasswordStatusEnable(req, res) {
        try {
            const { organization_id } = req.decoded.userData;
            let [isEnable] = await BiometricModel.getEmployeePasswordStatus(organization_id);
            if(!isEnable) return sendResponse(res, 400, null, 'Organization not found', null);
            return sendResponse(res, 200, { status : isEnable?.is_biometrics_employee || 0 }, 'Success', null);
        } catch (error) {
            return sendResponse(res, 400, null, 'Something went wrong', error);
        }
    }

    async verifySecretKey(req, res) {
        try {
            const { organization_id } = req.decoded.userData;
            let secretKey = req.body.secretKey;
            let [isEnable] = await BiometricModel.getEmployeePasswordStatus(organization_id);
            if(!isEnable) return sendResponse(res, 400, null, 'Organization not found', null);
            let passwordCheckStatus = isEnable?.is_biometrics_employee || 0;
            if(passwordCheckStatus) {
                let [getSecreatKey] = await BiometricModel.getSecreatKey(organization_id);

                let decryptedKey = await PasswordEncoderDecoder.decryptText(getSecreatKey?.secret_key, process.env.CRYPTO_PASSWORD);
                if(secretKey != decryptedKey) return sendResponse(res, 400, null, 'Invalid SecretKey', null);
                else return sendResponse(res, 200, null, 'Success', null);
            } else return sendResponse(res, 400, null, 'Passowrd check not enable', null);
        } catch (error) {
            return sendResponse(res, 400, null, 'Something went wrong', error);
        }
    }

    async getDepartment(req, res) {
        try {
            const { organization_id } = req.decoded.userData;
            let department = await BiometricModel.getBiometricsDepartment(organization_id);
            return sendResponse(res, 200, department, 'Success', null);
        } catch (error) {
            return sendResponse(res, 400, null, 'Something went wrong', error);
        }
    }

    async getQrCode(req, res, next) {
        try {
            let data = req.query.data;
            if(!data) return sendResponse(res, 400, null, 'No data provided', null);
            let type = req.query.type || 1;
            qrOptions.data = data;
            const qrCode = new QRCodeCanvas(qrOptions);
            if(type === 1) {
                let buffer = await qrCode.toBuffer();
                res.setHeader('Content-Type', 'image/png');
                return res.send(buffer);
            }
            else if(type == 2) {
                let base64URl = await qrCode.toDataUrl();
                return res.json({
                    code: 200,
                    message: 'QR code generated successfully',
                    data: base64URl,
                    error: null,
                })
            }
        }
        catch (error) {
            next(error);
        }
    }

   async deleteUserProfileImage(req, res) {
        const { userId } = req.body;
        try {
            if(!userId) return sendResponse(res, 400, null, 'userId required', null);
            const [userData] = await BiometricModel.getUserDetails(userId);  
            if(!userData) return sendResponse(res, 400, null, 'User not found', null);      
            let prefix = `${userData.organization_email}/${userId}.jpg`;
            const [files] = await bucket.getFiles({ prefix }); 
            if (files.length === 0) {
                console.log('No files found with the given prefix.');
            } else {
                await Promise.all(files.map(file => file.delete()));
                console.log('File(s) deleted successfully.');
            }  
            await BiometricModel.deleteUserFace(userId);        
            return sendResponse(res, 200, null, 'Profile picture delete successfully', null);

        } catch (err) {
            console.log(err)
            throw err;
        } 
    }

}

module.exports = new DepartmentController;



function generateOTP () {
    return Math.floor(100000 + Math.random() * 900000);
}

const uploadImage = (file, folderName) =>
    new Promise(async (resolve, reject) => {

        const { originalname, buffer } = file;
        try {
            const blob = storage.bucket(bucketName).file(`${folderName}/${originalname.replace(/ /g, '_')}`);
            const blobStream = blob.createWriteStream({
                resumable: false,
            });
            const timestamp = Date.now();

            blobStream
                .on('finish', async () => {
                    const options = {
                        entity: 'allUsers',
                        role: storage.acl.READER_ROLE,
                    };

                    try {
                        await blob.acl.add(options);
                        const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}?timestamp=${timestamp}`;

                        resolve(publicUrl);
                    } catch (aclError) {
                        reject(`Error applying ACL: ${aclError}`);
                    }
                })
                .on('error', (err) => {
                    reject(`Unable to upload file, something went wrong: ${err}`);
                })
                .end(buffer);
        } catch (err) {
            reject(`Error uploading image: ${err}`);
        }
    });



const updateCountersOnMatch = async ({ date, organization_id, count, department_id }) => {
  try {
    let [previousData] = await BiometricModel.getCurrentCounters({
      date,
      organization_id,
      department_id
    });
    if (previousData) {
        if(count) {
            let currentCount = previousData.access_count + +count;
            let updateCurrentCounters = await BiometricModel.updateCurrentCounters({
              id: previousData.id,
              access_count: currentCount,
            });
            return updateCurrentCounters;
        } else {
            let currentCount = previousData.access_count + 1;
            let updateCurrentCounters = await BiometricModel.updateCurrentCounters({
              id: previousData.id,
              access_count: currentCount,
            });
            return updateCurrentCounters;
        }
    } else {
        if(count) {
            let createCureentCounters = await BiometricModel.createCurrentCounters({
                date,
                organization_id,
                access_count: +count,
                department_id
              });
              return createCureentCounters;
        }
        else {
            let createCureentCounters = await BiometricModel.createCurrentCounters({
                date,
                organization_id,
                access_count: 1,
                department_id
              });
              return createCureentCounters;
        }
    }
  } catch (error) {
    console.log("Error updating counters", error);
  }
};


const addLogsDepartment = async ({
    employee_id,
    organization_id,
    department_id,
    date,
    isoString
}) => {
    try {
        let previousData = await BiometricModel.findLastAccessLog({ employee_id, organization_id, date: +date.split('-').join(''), department_id });
        if(previousData) {
            if(previousData.end_time) {
                return await BiometricModel.addAccessLogs(employee_id, organization_id, isoString, +date.split('-').join(''), department_id);
            } 
            else {
                previousData.end_time = isoString;
                return await previousData.save();
            }
        }
        else {
            return await BiometricModel.addAccessLogs(employee_id, organization_id, isoString, +date.split('-').join(''), department_id);
        }
    } catch (error) {
        throw error;
    }
}
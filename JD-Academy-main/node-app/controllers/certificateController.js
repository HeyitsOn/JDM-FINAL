const certificateService = require('../services/certificateService');

async function generateCertificate(req, res, next) {
  try {
    const userId = req.session.userId;
    const levelKey = String(req.query.level || '').trim();

    if (!certificateService.isAllowedLevel(levelKey)) {
      return res.status(400).send('Unknown course level.');
    }

    const user = req.user;
    if (!user) {
      return res.status(404).send('Account not found.');
    }

    const levelInfo = await certificateService.getLevelRequirements(levelKey);
    if (!levelInfo) {
      return res.status(400).send('Unknown course level.');
    }

    const done = await certificateService.getCompletedTopicCount(userId, levelKey);
    if (done < Number(levelInfo.required_topics)) {
      return res.status(403).send(
        `You have not completed all topics for this level yet. Keep going — you're at ${done} of ${levelInfo.required_topics} topics!`
      );
    }

    let cert = await certificateService.findCertificate(userId, levelKey);
    let issuedAt;
    let code;
    if (cert) {
      code = cert.certificate_code;
      issuedAt = cert.issued_at;
    } else {
      const created = await certificateService.createCertificate(userId, levelKey);
      code = created.code;
      issuedAt = created.issuedAt;
    }

    const verifyUrl = `${process.env.SITE_URL || ''}/verify-certificate?code=${encodeURIComponent(code)}`;

    res.render('certificate', {
      studentName: user.name,
      levelLabel: levelInfo.level_label,
      issuedDateDisplay: new Date(issuedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      }),
      code,
      verifyUrl,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyCertificate(req, res, next) {
  try {
    const code = String(req.query.code || '').trim();
    let result = null;
    if (code) {
      result = await certificateService.verifyCertificate(code);
    }
    res.render('verify-certificate', { code, result });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateCertificate, verifyCertificate };

const reportsService = require('./reportsService');

/**
 * Controller para obtener el resumen de reportes y analíticas ejecutivas.
 */
async function getDashboardSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const summary = await reportsService.getDashboardSummary({ startDate, endDate });

    return res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary
};

import core from './core.js';
import nav from './nav.js';
import auth from './auth.js';
import footer from './footer.js';
import guest from './guest.js';
import admin from './admin.js';
import reportUi from './reportUi.js';
import userMap from './userMap.js';
import userRouting from './userRouting.js';
import userEmergency from './userEmergency.js';
import userForms from './userForms.js';

export default {
  ...core,
  ...nav,
  ...auth,
  ...footer,
  ...guest,
  ...admin,
  ...reportUi,
  ...userMap,
  ...userRouting,
  ...userEmergency,
  ...userForms,
};

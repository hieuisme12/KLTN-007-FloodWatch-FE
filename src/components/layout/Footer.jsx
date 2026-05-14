import React from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import GuestAwareLink from '../common/GuestAwareLink';
import { FaFacebook, FaTwitter, FaYoutube, FaLinkedin, FaEnvelope, FaPhone } from 'react-icons/fa6';
import { MdLocationOn } from 'react-icons/md';
import { useSidebar } from '@/context/SidebarProvider';
import { cn } from '@/lib/cn';

const Footer = () => {
  const { t } = useTranslation();
  const { collapsed } = useSidebar();
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'relative z-[1] mt-auto bg-gradient-to-b from-[#1565c0] to-[#0d47a1] p-0 text-white transition-[margin-left,width] duration-100 ease-linear',
        collapsed
          ? 'ml-0 w-full md:ml-[70px] md:w-[calc(100%-70px)]'
          : 'ml-0 w-full md:ml-[220px] md:w-[calc(100%-220px)] lg:ml-[260px] lg:w-[calc(100%-260px)]'
      )}
    >
      <div className="mx-auto max-w-[1400px] px-4 pb-4 pt-6 md:px-5 md:pb-5 md:pt-10">
        <div className="mb-4 border-b border-white/20 pb-4 md:hidden">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-[12px] text-white/95">
            <Link to="/dashboard" className="no-underline hover:text-white">
              {t('footer.home')}
            </Link>
            <span className="text-white/40">|</span>
            <Link to="/map" className="no-underline hover:text-white">
              {t('footer.map')}
            </Link>
            <span className="text-white/40">|</span>
            <Link to="/routing" className="no-underline hover:text-white">
              {t('footer.routing')}
            </Link>
            <span className="text-white/40">|</span>
            <Link to="/reports" className="no-underline hover:text-white">
              {t('footer.reports')}
            </Link>
            <span className="text-white/40">|</span>
            <GuestAwareLink to="/report/new" requiresAuth className="no-underline hover:text-white">
              {t('footer.sendReport')}
            </GuestAwareLink>
            <span className="text-white/40">|</span>
            <Link to="/faq" className="no-underline hover:text-white">
              {t('footer.faq')}
            </Link>
            <span className="text-white/40">|</span>
            <Link to="/contact" className="no-underline hover:text-white">
              {t('footer.contact')}
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] leading-snug text-white/75">
            {t('footer.copyrightMobile', { year })}
          </p>
        </div>

        <div className="mb-[30px] hidden grid-cols-1 gap-10 max-md:gap-[30px] md:grid md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
          <div className="flex flex-col gap-4">
            <div className="mb-2 flex items-center gap-3">
              <img src="/logo_mini.png" alt="IUH Logo" className="h-6 w-6 flex-shrink-0 object-contain" />
              <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">
                {t('footer.brand')}
              </h3>
            </div>
            <p className="m-0 text-sm leading-relaxed text-white/90 max-md:text-[13px]">{t('footer.intro')}</p>
            <div className="mt-2 flex gap-3">
              <a
                href="https://www.facebook.com/trieuminh1003"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaFacebook />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaTwitter />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaYoutube />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white no-underline transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <FaLinkedin />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">
              {t('footer.quickLinks')}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <li className="m-0">
                <Link
                  to="/dashboard"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.home')}
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/reports"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.floodReports')}
                </Link>
              </li>
              <li className="m-0">
                <GuestAwareLink
                  to="/report/new"
                  requiresAuth
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.newReport')}
                </GuestAwareLink>
              </li>
              <li className="m-0">
                <GuestAwareLink
                  to="/profile"
                  requiresAuth
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.account')}
                </GuestAwareLink>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">
              {t('footer.info')}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <li className="m-0">
                <Link
                  to="/about"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.about')}
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/privacy"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/terms"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/faq"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.faqLong')}
                </Link>
              </li>
              <li className="m-0">
                <Link
                  to="/contact"
                  className="inline-block text-sm text-white/90 no-underline transition-all duration-200 ease-in-out hover:pl-1 hover:text-white max-md:text-[13px]"
                >
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="m-0 text-lg font-bold uppercase tracking-wide text-white max-md:text-base">
              {t('footer.contactSection')}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              <li className="m-0 flex items-start gap-3 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
                <MdLocationOn className="mt-0.5 flex-shrink-0 text-lg text-white" />
                <span className="flex-1">{t('footer.address')}</span>
              </li>
              <li className="m-0 flex items-start gap-3 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
                <FaPhone className="mt-0.5 flex-shrink-0 text-lg text-white" />
                <span className="flex-1">{t('footer.hotline')}</span>
              </li>
              <li className="m-0 flex items-start gap-3 text-sm leading-relaxed text-white/90 max-md:text-[13px]">
                <FaEnvelope className="mt-0.5 flex-shrink-0 text-lg text-white" />
                <span className="flex-1">{t('footer.email')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 hidden border-t border-white/20 pt-5 md:block">
          <div className="text-center text-[13px] leading-relaxed text-white/80">
            <p className="my-1">{t('footer.copyright', { year })}</p>
            <p className="mt-2 text-xs text-white/70">
              <Trans
                i18nKey="footer.developedBy"
                components={{ 1: <strong className="font-semibold text-white/90" /> }}
              />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

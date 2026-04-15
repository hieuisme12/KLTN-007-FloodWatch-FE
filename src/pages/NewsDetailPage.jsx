import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaClock } from 'react-icons/fa6';
import ErrorToast from '../components/common/ErrorToast';
const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);

        // Decode URL từ id
        const articleUrl = decodeURIComponent(id);
        
        // Kiểm tra xem có phải là trang danh sách thủy triều không
        const isTideListPage = articleUrl.includes('thuy-trieu-23-15.html');
        
        // Sử dụng CORS proxy để fetch nội dung với retry logic
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`;
        
        // Retry logic với exponential backoff
        let response = null;
        let lastError = null;
        const maxRetries = 3;
        const baseTimeout = 30000; // 30 giây
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            response = await axios.get(proxyUrl, {
              timeout: baseTimeout + (attempt * 10000), // Tăng timeout mỗi lần retry
              validateStatus: () => true,
              headers: {
                'Accept': 'application/json',
              }
            });
            
            // Nếu thành công, break khỏi loop
            if (response && response.data) {
              break;
            }
          } catch (err) {
            lastError = err;
            // Nếu không phải lần thử cuối, đợi một chút rồi thử lại
            if (attempt < maxRetries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // Nếu vẫn không có response sau tất cả retries
        if (!response || !response.data) {
          throw lastError || new Error('Không thể tải nội dung sau nhiều lần thử');
        }

        if (response.data && response.data.contents) {
          const htmlContent = response.data.contents;
          
          // Parse HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          
          // Nếu là trang danh sách thủy triều, CHỈ parse danh sách các bản tin thủy triều
          if (isTideListPage) {
            const tideItems = [];
            
            // Tìm tất cả text chứa "Bản tin dự báo thủy triều" trong toàn bộ document
            const bodyText = doc.body.innerText || doc.body.textContent || '';
            
            // Tìm pattern: "Bản tin dự báo thủy triều 10 ngày (từ 03/02 đến 12/02/2026) ( 03/02/2026 09:00 )"
            // Pattern này match từ "Bản tin" đến hết dòng hoặc đến dấu ngoặc đóng cuối cùng
            const tidePattern = /Bản tin dự báo thủy triều[^(]*\([^)]*\)\s*\([^)]*\)/g;
            let match;
            
            while ((match = tidePattern.exec(bodyText)) !== null) {
              let fullText = match[0].trim();
              
              // Extract date từ phần cuối: ( 03/02/2026 09:00 )
              const dateTimeMatch = fullText.match(/\(\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s*\)/);
              const date = dateTimeMatch ? dateTimeMatch[1] : '';
              const time = dateTimeMatch ? dateTimeMatch[2] : '';
              
              // Extract date range: (từ 03/02 đến 12/02/2026)
              const dateRangeMatch = fullText.match(/\(từ\s+(\d{2}\/\d{2})\s+đến\s+(\d{2}\/\d{2}\/\d{4})\)/);
              
              // Clean up text - loại bỏ các khoảng trắng thừa
              fullText = fullText.replace(/\s+/g, ' ').trim();
              
              // Tìm link PDF liên quan (nếu có trong HTML)
              let pdfLink = null;
              const allLinks = doc.querySelectorAll('a');
              allLinks.forEach(link => {
                const linkText = link.textContent?.trim() || '';
                // Kiểm tra xem link text có chứa cùng date hoặc date range không
                if (linkText.includes('Bản tin dự báo thủy triều')) {
                  const linkHasDate = date && linkText.includes(date);
                  const linkHasDateRange = dateRangeMatch && linkText.includes(dateRangeMatch[2]);
                  
                  if (linkHasDate || linkHasDateRange) {
                    const href = link.getAttribute('href');
                    if (href && (href.includes('.pdf') || href.includes('thuy-trieu'))) {
                      pdfLink = href.startsWith('http') ? href : `https://nchmf.gov.vn${href}`;
                    }
                  }
                }
              });
              
              tideItems.push({
                text: fullText,
                date: date,
                time: time,
                dateRange: dateRangeMatch ? `từ ${dateRangeMatch[1]} đến ${dateRangeMatch[2]}` : null,
                link: pdfLink
              });
            }
            
            // Nếu không tìm thấy bằng pattern, thử cách khác: tìm trong các list items
            if (tideItems.length === 0) {
              const listItems = doc.querySelectorAll('li');
              listItems.forEach(li => {
                const text = li.textContent?.trim() || '';
                if (text.includes('Bản tin dự báo thủy triều') && text.length > 30 && text.length < 200) {
                  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
                  const date = dateMatch ? dateMatch[1] : '';
                  
                  // Tìm link PDF trong item này
                  const pdfLinkEl = li.querySelector('a[href*=".pdf"]');
                  const pdfLink = pdfLinkEl?.getAttribute('href');
                  
                  tideItems.push({
                    text: text,
                    date: date,
                    time: null,
                    dateRange: null,
                    link: pdfLink ? (pdfLink.startsWith('http') ? pdfLink : `https://nchmf.gov.vn${pdfLink}`) : null
                  });
                }
              });
            }
            
            // Loại bỏ duplicate dựa trên text
            const uniqueTideItems = tideItems.filter((item, index, self) =>
              index === self.findIndex(t => t.text === item.text)
            );
            
            // CHỈ hiển thị danh sách bản tin thủy triều, không có phần khác
            if (uniqueTideItems.length > 0) {
              const listHtml = `
                <div style="max-width: 100%;">
                  <h2 style="color: #1976d2; margin-bottom: 20px; font-size: 24px;">
                    Danh sách bản tin dự báo thủy triều
                  </h2>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    ${uniqueTideItems.map((item) => `
                      <li style="padding: 20px; margin-bottom: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9;">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1976d2; font-weight: 600;">
                          ${item.text}
                        </h3>
                        ${item.date ? `
                          <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>Ngày:</strong> ${item.date}${item.time ? ` - ${item.time}` : ''}
                          </p>
                        ` : ''}
                        ${item.dateRange ? `
                          <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>Thời gian dự báo:</strong> ${item.dateRange}
                          </p>
                        ` : ''}
                        ${item.link ? `
                          <a href="${item.link}" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">
                            Xem PDF &gt;&gt;
                          </a>
                        ` : ''}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `;
              
              setArticle({
                title: 'Bản tin dự báo thủy triều',
                content: listHtml,
                date: uniqueTideItems[0]?.date || new Date().toLocaleDateString('vi-VN'),
                sourceUrl: articleUrl
              });
              setLoading(false);
              return;
            } else {
              // Nếu không tìm thấy bản tin nào, hiển thị thông báo
              setArticle({
                title: 'Bản tin dự báo thủy triều',
                content: '<p>Hiện tại chưa có bản tin dự báo thủy triều mới.</p>',
                date: new Date().toLocaleDateString('vi-VN'),
                sourceUrl: articleUrl
              });
              setLoading(false);
              return;
            }
          }
          
          // Extract thông tin bài viết (cho các trang khác)
          const title = doc.querySelector('h1, .title, .article-title, .post-title, .page-title')?.textContent?.trim() || 
                       doc.querySelector('title')?.textContent?.trim() || 
                       'Bản tin dự báo thủy triều';
          
          // Tìm nội dung chính - thử nhiều selector khác nhau
          const contentSelectors = [
            '.article-content',
            '.post-content',
            '.content',
            'article',
            '.main-content',
            '#content',
            '.entry-content',
            '.news-content',
            '.page-content',
            '.body-content',
            'main',
            '.container .row .col',
            '.col-md-8',
            '.col-md-9',
            '.col-lg-8',
            '.col-lg-9'
          ];
          
          let content = null;
          for (const selector of contentSelectors) {
            const elements = doc.querySelectorAll(selector);
            // Tìm element có nhiều text nhất (thường là nội dung chính)
            if (elements.length > 0) {
              let maxTextLength = 0;
              let bestElement = null;
              elements.forEach(el => {
                const textLength = el.textContent?.trim().length || 0;
                if (textLength > maxTextLength && textLength > 100) {
                  maxTextLength = textLength;
                  bestElement = el;
                }
              });
              if (bestElement) {
                content = bestElement;
                break;
              }
            }
          }
          
          // Nếu không tìm thấy, tìm element có nhiều text nhất trong body
          if (!content) {
            const bodyChildren = Array.from(doc.body.children);
            let maxTextLength = 0;
            let bestElement = null;
            
            bodyChildren.forEach(el => {
              // Bỏ qua các phần không phải nội dung
              const tagName = el.tagName?.toLowerCase();
              if (['script', 'style', 'nav', 'header', 'footer', 'aside'].includes(tagName)) {
                return;
              }
              
              const textLength = el.textContent?.trim().length || 0;
              if (textLength > maxTextLength && textLength > 200) {
                maxTextLength = textLength;
                bestElement = el;
              }
            });
            
            if (bestElement) {
              content = bestElement;
            } else {
              content = doc.body;
            }
          }
          
          // Clone content để không ảnh hưởng đến DOM gốc
          const contentClone = content.cloneNode(true);
          
          // Loại bỏ các phần không cần thiết
          const unwantedSelectors = [
            'script',
            'style',
            'nav',
            'header',
            'footer',
            'aside',
            '.menu',
            '.sidebar',
            '.advertisement',
            '.ads',
            '.ad',
            '.navigation',
            '.navbar',
            '.breadcrumb',
            '.pagination',
            '.comments',
            '.social-share',
            '.related-posts',
            'iframe',
            '.iframe',
            '.video-container'
          ];
          
          unwantedSelectors.forEach(selector => {
            contentClone.querySelectorAll(selector).forEach(el => el.remove());
          });
          
          // Loại bỏ các element chỉ có class/id không liên quan đến nội dung
          contentClone.querySelectorAll('[class*="menu"], [class*="nav"], [class*="sidebar"], [id*="menu"], [id*="nav"]').forEach(el => {
            const textLength = el.textContent?.trim().length || 0;
            if (textLength < 50) {
              el.remove();
            }
          });
          
          // Nếu là trang thủy triều, loại bỏ phần thời tiết không liên quan
          if (articleUrl.includes('thuy-trieu')) {
            // Loại bỏ các phần chứa "Thời tiết" nhưng không liên quan đến thủy triều
            contentClone.querySelectorAll('*').forEach(el => {
              const text = el.textContent?.toLowerCase() || '';
              // Nếu element chứa "thời tiết" nhưng không chứa "thủy triều" và là phần lớn
              if (text.includes('thời tiết') && !text.includes('thủy triều') && 
                  !text.includes('thuy-trieu') && el.children.length > 3) {
                // Kiểm tra xem có phải là phần thời tiết chính không
                const hasWeatherRegions = text.includes('hà nội') || text.includes('nam bộ') || 
                                         text.includes('trung bộ') || text.includes('bắc bộ');
                if (hasWeatherRegions) {
                  el.remove();
                }
              }
            });
          }
          
          // Giữ lại các phần quan trọng: p, h1-h6, ul, ol, li, table, img, a, div, span (và semantic inline)
          // Đảm bảo giữ lại tất cả text và table — innerHTML bên dưới giữ nguyên cấu trúc đã clone

          // Lấy HTML content
          let articleContent = contentClone.innerHTML;
          
          // Clean up: loại bỏ các attribute không cần thiết nhưng giữ lại src, href, alt
          articleContent = articleContent.replace(/\s+on\w+="[^"]*"/gi, ''); // Loại bỏ event handlers
          articleContent = articleContent.replace(/\s+class="[^"]*"/gi, ''); // Loại bỏ class
          articleContent = articleContent.replace(/\s+id="[^"]*"/gi, ''); // Loại bỏ id
          
          // Extract date từ title hoặc content
          const datePatterns = [
            /(\d{2}\/\d{2}\/\d{4})/,
            /(\d{2}-\d{2}-\d{4})/,
            /(\d{4}-\d{2}-\d{2})/
          ];
          
          let date = null;
          for (const pattern of datePatterns) {
            const match = (title + ' ' + articleContent).match(pattern);
            if (match) {
              date = match[1];
              break;
            }
          }
          
          if (!date) {
            date = new Date().toLocaleDateString('vi-VN');
          }
          
          setArticle({
            title,
            content: articleContent,
            date,
            sourceUrl: articleUrl
          });
        } else {
          throw new Error('Không thể tải nội dung');
        }
      } catch (error) {
        
        // Hiển thị thông báo lỗi chi tiết hơn
        let errorMessage = 'Không thể tải nội dung bài viết.';
        
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage = 'Yêu cầu tải nội dung quá lâu. Vui lòng kiểm tra kết nối mạng và thử lại.';
        } else if (error.response) {
          errorMessage = `Lỗi từ server: ${error.response.status}. Vui lòng thử lại sau.`;
        } else if (error.message) {
          errorMessage = `Lỗi: ${error.message}. Vui lòng thử lại sau.`;
        } else {
          errorMessage = 'Không thể tải nội dung bài viết. Vui lòng thử lại sau.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="news-detail-page">
        <div className="news-detail-container">
          <div className="news-detail-loading">
            <div className="loading-spinner"></div>
            <p>Đang tải nội dung...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-detail-page">
        <ErrorToast message={error} onClose={() => setError(null)} />
        <div className="news-detail-container">
          <button className="news-detail-back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Quay lại
          </button>
          <div className="news-detail-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="news-detail-page">
      <div className="news-detail-container">
        <button className="news-detail-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Quay lại
        </button>
        
        <article className="news-detail-article">
          <header className="news-detail-header">
            <h1 className="news-detail-title">{article.title}</h1>
            <div className="news-detail-meta">
              <span className="news-detail-date">
                <FaClock /> {article.date}
              </span>
              <span className="news-detail-source">
                Nguồn: <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Trung tâm Dự báo khí tượng thủy văn quốc gia
                </a>
              </span>
            </div>
          </header>
          
          <div 
            className="news-detail-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </div>
    </div>
  );
};

export default NewsDetailPage;


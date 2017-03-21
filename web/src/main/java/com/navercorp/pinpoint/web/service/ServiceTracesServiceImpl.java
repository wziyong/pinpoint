/*
 * Copyright 2014 NAVER Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.navercorp.pinpoint.web.service;

import com.navercorp.pinpoint.web.dao.ServiceTracesDao;
import com.navercorp.pinpoint.web.vo.ServiceTraces;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author netspider
 * @author HyunGil Jeong
 */
@Service
public class ServiceTracesServiceImpl implements ServiceTracesService {

    @Autowired
    private ServiceTracesDao serviceTracesDao;

    @Override
    public List<ServiceTraces> getTraceList(String service) {
        return serviceTracesDao.getTraceList(service);
    }

}